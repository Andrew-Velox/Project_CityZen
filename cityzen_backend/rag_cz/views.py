from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.serializers import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Document, QueryHistory
from .serializers import DocumentSerializer, QueryHistorySerializer
from .services import RAGService


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        uploaded_file = serializer.validated_data.get("file")

        file_size = None
        content_type = None

        if uploaded_file is not None:
            file_size = getattr(uploaded_file, "size", None)
            content_type = getattr(uploaded_file, "content_type", None)

        serializer.save(
            user=self.request.user,
            file_size=file_size,
            content_type=content_type,
        )

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to update this document.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to delete this document.")
        instance.delete()

    @action(detail=True, methods=["patch"], url_path="processing-status")
    def processing_status(self, request, pk=None):
        document = self.get_object()

        processed = request.data.get("processed")
        processing_error = request.data.get("processing_error")
        chunk_count = request.data.get("chunk_count")

        if processed is not None:
            document.processed = bool(processed)

        if processing_error is not None:
            document.processing_error = processing_error

        if chunk_count is not None:
            try:
                document.chunk_count = int(chunk_count)
            except (TypeError, ValueError) as exc:
                raise ValidationError({"chunk_count": "chunk_count must be an integer."}) from exc

        document.save(update_fields=["processed", "processing_error", "chunk_count"])
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=["post"], url_path="process")
    def process(self, request, pk=None):
        document = self.get_object()
        service = RAGService(user_id=request.user.id)
        result = service.process_document(document)

        document.processed = result.get("ok", False)
        document.processing_error = result.get("error") or ""
        document.chunk_count = result.get("chunk_count", 0)
        document.save(update_fields=["processed", "processing_error", "chunk_count"])

        response_status = status.HTTP_200_OK if result.get("ok") else status.HTTP_400_BAD_REQUEST
        return Response(self.get_serializer(document).data, status=response_status)


class QueryHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = QueryHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = QueryHistory.objects.filter(user=self.request.user).select_related("document")

        document_id = self.request.query_params.get("document")
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        return queryset

    def perform_create(self, serializer):
        document = serializer.validated_data.get("document")

        if document is not None and document.user_id != self.request.user.id:
            raise PermissionDenied("You can only reference your own documents.")

        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to update this query history.")

        document = serializer.validated_data.get("document")
        if document is not None and document.user_id != self.request.user.id:
            raise PermissionDenied("You can only reference your own documents.")

        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to delete this query history.")
        instance.delete()

    @action(detail=False, methods=["post"], url_path="ask")
    def ask(self, request):
        question = request.data.get("question", "")
        document_id = request.data.get("document")
        top_k = request.data.get("top_k", 3)

        if not question or not str(question).strip():
            raise ValidationError({"question": "question is required."})

        try:
            top_k_value = int(top_k)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"top_k": "top_k must be an integer."}) from exc

        target_document = None
        if document_id:
            try:
                target_document = Document.objects.get(id=document_id, user=request.user)
            except Document.DoesNotExist as exc:
                raise ValidationError({"document": "Document not found for this user."}) from exc

        service = RAGService(user_id=request.user.id)
        rag_result = service.query(
            question=str(question).strip(),
            top_k=top_k_value,
            document_id=target_document.id if target_document else None,
        )

        history = QueryHistory.objects.create(
            user=request.user,
            document=target_document,
            query=str(question).strip(),
            response=rag_result.get("answer", ""),
            top_k=top_k_value,
        )

        serialized_history = self.get_serializer(history)
        return Response(
            {
                "history": serialized_history.data,
                "sources": rag_result.get("sources", []),
            },
            status=status.HTTP_201_CREATED,
        )
