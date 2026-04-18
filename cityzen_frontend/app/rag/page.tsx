"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { askRagQuestion, listRagDocuments, processRagDocument, uploadRagDocument } from "@/lib/api/rag";
import { refreshAccessToken } from "@/lib/api/auth";
import { ApiError, type RagAskResponse, type RagDocument } from "@/lib/api/types";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";

type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  sources: string[];
  createdAt: string;
};

export default function RagPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const processedCount = useMemo(
    () => documents.filter((doc) => doc.processed).length,
    [documents],
  );

  const withAuthRetry = useCallback(async <T,>(action: (token: string) => Promise<T>): Promise<T> => {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    if (!access) {
      router.replace("/login");
      throw new Error("Not authenticated");
    }

    try {
      return await action(access);
    } catch (err) {
      const shouldRefresh = err instanceof ApiError && err.status === 401 && Boolean(refresh);
      if (!shouldRefresh) throw err;

      const refreshed = await refreshAccessToken(refresh as string);
      setTokens(refreshed.access, refresh as string);
      return action(refreshed.access);
    }
  }, [router]);

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    setError(null);

    try {
      const docs = await withAuthRetry((token) => listRagDocuments(token));
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoadingDocs(false);
    }
  }, [withAuthRetry]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError("Choose a file first.");
      return;
    }

    const finalTitle = title.trim() || selectedFile.name;
    setUploading(true);

    try {
      const created = await withAuthRetry((token) =>
        uploadRagDocument(token, {
          title: finalTitle,
          file: selectedFile,
        }),
      );

      setDocuments((prev) => [created, ...prev]);
      setSelectedFile(null);
      setTitle("");
      setSuccess(`Uploaded ${created.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleProcessDocument(documentId: number) {
    setError(null);
    setSuccess(null);
    setProcessingId(documentId);

    try {
      const updated = await withAuthRetry((token) => processRagDocument(token, documentId));
      setDocuments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (updated.processed) {
        setSuccess(`Processed ${updated.title} successfully.`);
      } else {
        setError(updated.processing_error || "Processing failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleAsk(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      setError("Please type a question.");
      return;
    }

    setAsking(true);

    try {
      const payload: { question: string; top_k: number; document?: number } = {
        question: normalizedQuestion,
        top_k: 3,
      };

      if (selectedDocumentId) {
        payload.document = Number(selectedDocumentId);
      }

      const result: RagAskResponse = await withAuthRetry((token) => askRagQuestion(token, payload));

      setChatTurns((prev) => [
        {
          id: String(result.history.id),
          question: result.history.query,
          answer: result.history.response,
          sources: result.sources,
          createdAt: result.history.created_at,
        },
        ...prev,
      ]);

      setQuestion("");
      setSuccess("Answer generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get answer.");
    } finally {
      setAsking(false);
    }
  }

  function logoutAndRedirect() {
    clearTokens();
    router.replace("/login");
  }

  return (
    <main className="px-4 pb-10 pt-28 sm:px-6">
      <section className="mx-auto w-full max-w-6xl space-y-5">
        <div className="rounded-3xl border border-[#d6e3f4] bg-white/95 p-5 shadow-[0_20px_50px_#0f2d5b1a]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.11em] text-[#4f6280]">CityZen RAG</p>
              <h1 className="text-2xl font-bold text-[#0f1f3d]">Chatbot Test Console</h1>
              <p className="mt-1 text-sm text-[#4f6280]">
                Upload documents, process embeddings, and ask questions against your personal knowledge base.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1f4fd7] px-4 py-2 font-semibold text-white transition hover:bg-[#173ea8]"
              onClick={logoutAndRedirect}
            >
              Log out
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-xl border border-[#dbe7f6] bg-[#f7fbff] p-3">
              <p className="text-xs text-[#576b8a]">Total documents</p>
              <p className="mt-1 text-xl font-semibold text-[#0e2244]">{documents.length}</p>
            </div>
            <div className="rounded-xl border border-[#dbe7f6] bg-[#f7fbff] p-3">
              <p className="text-xs text-[#576b8a]">Processed</p>
              <p className="mt-1 text-xl font-semibold text-[#0e2244]">{processedCount}</p>
            </div>
            <div className="rounded-xl border border-[#dbe7f6] bg-[#f7fbff] p-3">
              <p className="text-xs text-[#576b8a]">Chat turns</p>
              <p className="mt-1 text-xl font-semibold text-[#0e2244]">{chatTurns.length}</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-[#fecaca] bg-[#fff5f5] px-4 py-3 text-sm text-[#b91c1c]">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fff5] px-4 py-3 text-sm text-[#166534]">{success}</div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1.5fr]">
          <section className="rounded-3xl border border-[#d6e3f4] bg-white/95 p-5 shadow-[0_16px_40px_#0f2d5b12]">
            <h2 className="text-lg font-semibold text-[#0f1f3d]">1. Upload Document</h2>
            <form className="mt-4 space-y-3" onSubmit={handleUpload}>
              <label className="block text-sm font-medium text-[#334a6b]">
                Title
                <input
                  className="mt-1 w-full rounded-xl border border-[#cbd9ec] px-3 py-2 outline-none focus:border-[#1f4fd7]"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional, default is filename"
                />
              </label>

              <label className="block text-sm font-medium text-[#334a6b]">
                File (.txt, .pdf, .docx)
                <input
                  className="mt-1 w-full rounded-xl border border-[#cbd9ec] px-3 py-2"
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1f4fd7] px-4 py-2 font-semibold text-white transition hover:bg-[#173ea8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </form>

            <h2 className="mt-7 text-lg font-semibold text-[#0f1f3d]">2. Process Document</h2>
            <div className="mt-3 max-h-[340px] space-y-3 overflow-auto pr-1">
              {loadingDocs ? <p className="text-sm text-[#50617f]">Loading documents...</p> : null}
              {!loadingDocs && documents.length === 0 ? (
                <p className="text-sm text-[#50617f]">No documents yet. Upload one to continue.</p>
              ) : null}

              {documents.map((doc) => (
                <article key={doc.id} className="rounded-xl border border-[#d7e4f4] bg-[#f9fbff] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#0f1f3d]">{doc.title}</h3>
                      <p className="text-xs text-[#5e7090]">
                        {doc.processed ? `Processed (${doc.chunk_count} chunks)` : "Not processed"}
                      </p>
                      {doc.processing_error ? (
                        <p className="mt-1 text-xs text-[#b91c1c]">{doc.processing_error}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProcessDocument(doc.id)}
                      disabled={processingId === doc.id}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#c9d8ef] bg-white px-3 text-sm font-semibold text-[#1b3f8a] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingId === doc.id ? "Processing..." : "Process"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#d6e3f4] bg-white/95 p-5 shadow-[0_16px_40px_#0f2d5b12]">
            <h2 className="text-lg font-semibold text-[#0f1f3d]">3. Ask Chatbot</h2>
            <form className="mt-4 space-y-3" onSubmit={handleAsk}>
              <label className="block text-sm font-medium text-[#334a6b]">
                Document scope (optional)
                <select
                  className="mt-1 w-full rounded-xl border border-[#cbd9ec] px-3 py-2 outline-none focus:border-[#1f4fd7]"
                  value={selectedDocumentId}
                  onChange={(event) => setSelectedDocumentId(event.target.value)}
                >
                  <option value="">All processed documents</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-[#334a6b]">
                Question
                <textarea
                  className="mt-1 min-h-[110px] w-full rounded-xl border border-[#cbd9ec] px-3 py-2 outline-none focus:border-[#1f4fd7]"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a question about your uploaded content"
                />
              </label>

              <button
                type="submit"
                disabled={asking}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1f4fd7] px-4 py-2 font-semibold text-white transition hover:bg-[#173ea8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {asking ? "Generating answer..." : "Ask"}
              </button>
            </form>

            <div className="mt-6 space-y-4">
              {chatTurns.length === 0 ? (
                <p className="text-sm text-[#50617f]">No chat history yet.</p>
              ) : null}

              {chatTurns.map((turn) => (
                <article key={turn.id} className="rounded-xl border border-[#d8e5f6] bg-[#f8fbff] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5f7393]">Question</p>
                  <p className="mt-1 text-sm text-[#1c2f4e]">{turn.question}</p>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#5f7393]">Answer</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#1c2f4e]">{turn.answer}</p>

                  {turn.sources.length > 0 ? (
                    <p className="mt-3 text-xs text-[#4f6384]">Sources: {turn.sources.join(", ")}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
