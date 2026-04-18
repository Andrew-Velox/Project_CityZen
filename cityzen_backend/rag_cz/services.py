import json
import logging
import re
import urllib.error
import urllib.request
from collections import Counter

from django.conf import settings
from django.db import transaction

from .models import Document, DocumentChunk


logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.groq_api_key = getattr(settings, "GROQ_API_KEY", "")
        self.groq_model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
        self.chunk_size = int(getattr(settings, "RAG_CHUNK_SIZE", 1200))
        self.chunk_overlap = int(getattr(settings, "RAG_CHUNK_OVERLAP", 180))

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"[a-zA-Z0-9]+", (text or "").lower())

    def _extract_text(self, document: Document) -> tuple[str, str]:
        file_name = (document.file.name or "").lower()

        if file_name.endswith(".txt"):
            with document.file.open("rb") as stream:
                return stream.read().decode("utf-8", errors="ignore"), ""

        if file_name.endswith(".pdf"):
            try:
                from pypdf import PdfReader
            except Exception as exc:
                return "", f"PDF support requires pypdf: {exc}"

            with document.file.open("rb") as stream:
                reader = PdfReader(stream)
                pages = [page.extract_text() or "" for page in reader.pages]
                return "\n".join(pages), ""

        if file_name.endswith(".docx"):
            try:
                from docx import Document as DocxDocument
            except Exception as exc:
                return "", f"DOCX support requires python-docx: {exc}"

            with document.file.open("rb") as stream:
                doc = DocxDocument(stream)
                paragraphs = [p.text for p in doc.paragraphs if p.text]
                return "\n".join(paragraphs), ""

        return "", "Unsupported file format. Use .txt, .pdf, or .docx."

    def _build_chunks(self, text: str) -> list[str]:
        normalized = re.sub(r"\s+", " ", text or "").strip()
        if not normalized:
            return []

        chunks: list[str] = []
        start = 0
        length = len(normalized)

        while start < length:
            end = min(start + self.chunk_size, length)
            chunk = normalized[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= length:
                break
            start = max(end - self.chunk_overlap, start + 1)

        return chunks

    @transaction.atomic
    def process_document(self, document: Document) -> dict:
        if document.user_id != self.user_id:
            return {"ok": False, "chunk_count": 0, "error": "Document does not belong to this user."}

        text, error = self._extract_text(document)
        if error:
            return {"ok": False, "chunk_count": 0, "error": error}

        chunks = self._build_chunks(text)
        if not chunks:
            return {"ok": False, "chunk_count": 0, "error": "No readable text found in document."}

        document.chunks.all().delete()
        DocumentChunk.objects.bulk_create(
            [
                DocumentChunk(
                    document=document,
                    chunk_index=index,
                    content=chunk,
                )
                for index, chunk in enumerate(chunks)
            ]
        )

        return {"ok": True, "chunk_count": len(chunks), "error": ""}

    def _score_chunk(self, question_counter: Counter, chunk_text: str) -> int:
        if not chunk_text:
            return 0

        chunk_counter = Counter(self._tokenize(chunk_text))
        score = 0
        for token, freq in question_counter.items():
            score += min(freq, chunk_counter.get(token, 0))

        return score

    def _ask_groq(self, question: str, context: str) -> str:
        if not self.groq_api_key:
            return "RAG is running in lightweight mode, but GROQ_API_KEY is missing. Please set it to enable AI answers."

        prompt = (
            "You are the CityZen assistant. Answer using only the context below. "
            "If context is insufficient, say you do not have enough information.\n\n"
            f"Context:\n{context}\n\nQuestion: {question}"
        )

        payload = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": "You are a factual assistant for CityZen."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.groq_api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
                return (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "I could not generate an answer.")
                )
        except urllib.error.HTTPError as exc:
            logger.error("Groq HTTP error: %s", exc)
            return "The AI provider returned an error. Please try again."
        except Exception as exc:
            logger.error("Groq request failed: %s", exc)
            return "Unable to reach the AI provider right now. Please try again."

    def query(self, question: str, top_k: int = 3, document_id: int | None = None) -> dict:
        normalized_question = (question or "").strip()
        if not normalized_question:
            return {"answer": "Please provide a question.", "sources": []}

        question_tokens = self._tokenize(normalized_question)
        if not question_tokens:
            return {"answer": "Please provide a valid text question.", "sources": []}

        chunk_qs = DocumentChunk.objects.filter(document__user_id=self.user_id).select_related("document")

        if document_id is not None:
            chunk_qs = chunk_qs.filter(document_id=document_id)

        chunks = list(chunk_qs)
        if not chunks:
            return {
                "answer": "I do not have indexed knowledge yet. Upload and process documents first.",
                "sources": [],
            }

        q_counter = Counter(question_tokens)
        scored = []
        for chunk in chunks:
            score = self._score_chunk(q_counter, chunk.content)
            if score > 0:
                scored.append((score, chunk))

        if not scored:
            return {
                "answer": "I could not find relevant information in your uploaded documents.",
                "sources": [],
            }

        scored.sort(key=lambda item: item[0], reverse=True)
        selected = [chunk for _, chunk in scored[: max(1, top_k)]]

        context_blocks = []
        seen_sources = set()
        sources: list[str] = []

        for chunk in selected:
            source_name = chunk.document.title or chunk.document.file.name
            context_blocks.append(f"[{source_name} | chunk {chunk.chunk_index}] {chunk.content}")
            if source_name not in seen_sources:
                sources.append(source_name)
                seen_sources.add(source_name)

        context = "\n\n".join(context_blocks)
        answer = self._ask_groq(normalized_question, context)

        return {"answer": answer, "sources": sources}

    def clear_database(self) -> bool:
        try:
            DocumentChunk.objects.filter(document__user_id=self.user_id).delete()
            return True
        except Exception as exc:
            logger.error("Error clearing chunk database for user %s: %s", self.user_id, exc)
            return False
