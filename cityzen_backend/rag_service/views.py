from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from django.shortcuts import redirect
from django.contrib import messages
from .models import Document, QueryHistory
from .serializers import (
    DocumentSerializer,
    DocumentUploadSerializer,
    QuerySerializer,
    QueryHistorySerializer
)
from .service import RAGService
import os
import logging

logger = logging.getLogger(__name__)


rag_service = None

def get_rag_service():
    global rag_service
    if rag_service is None:
        rag_service = RAGService()
    return rag_service


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user documents.
    
    Provides CRUD operations for document uploads, retrieval, and management.
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    

    def get_queryset(self):
        """Return only documents belonging to the authenticated user."""
        return Document.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action in ['create', 'update']:
            return DocumentUploadSerializer
        return DocumentSerializer

    @extend_schema(
        summary="List user documents",
        description="""
        Retrieve a list of all documents uploaded by the authenticated user.
        
        **Returns:**
        - List of documents with file info, upload date, and processing status
        - Only shows documents belonging to the authenticated user
        
        **Authentication:**
        - Requires valid JWT access token
        """,
        responses={
            200: DocumentSerializer(many=True),
            401: OpenApiTypes.OBJECT,
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Upload a new document",
        description="""
        Upload a new document file for processing.
        
        **Supported File Types:**
        - PDF (.pdf)
        - Word Documents (.docx)
        - Text files (.txt)
        
        **Max File Size:** 10MB
        
        **Process:**
        1. User uploads document file
        2. Title is automatically generated from filename
        3. File is stored in the system
        4. Document is queued for processing
        
        **Request:**
        - Content-Type: multipart/form-data
        - Field: `file` (required) - The document file to upload
        
        **Authentication:**
        - Requires valid JWT access token
        """,
        request=DocumentUploadSerializer,
        responses={
            201: DocumentSerializer,
            400: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
        }
    )
    def create(self, request):
        """Upload and process document"""
        serializer = DocumentUploadSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        document = serializer.save()
        
        try:
            result = get_rag_service().process_document(document.file.path)
            
            if result:
                document.processed = True
                document.save()
            
            return Response(DocumentSerializer(document).data, status=201)
        except Exception as e:
            document.delete()
            return Response({'error': str(e)}, status=500)

    @extend_schema(
        summary="Retrieve a specific document",
        description="""
        Get details of a specific document by ID.
        
        **Returns:**
        - Document details including file URL, upload date, and processing status
        - Only accessible if the document belongs to the authenticated user
        
        **Authentication:**
        - Requires valid JWT access token
        """,
        responses={
            200: DocumentSerializer,
            401: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Delete a document",
        description="""
        Permanently delete a document and rebuild vector store.
        
        **Process:**
        1. Document record is removed from database
        2. Physical file is deleted from storage
        3. Vector store is cleared
        4. Vector store is rebuilt from remaining documents
        5. All remaining documents are reprocessed
        
        **Note:**
        - This operation may take time if many documents remain
        - All remaining documents will be reprocessed to rebuild the vector store
        - Cannot be undone
        
        **Authentication:**
        - Requires valid JWT access token
        - Can only delete own documents
        """,
        responses={
            200: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        }
    )
    def destroy(self, request, *args, **kwargs):
        """Delete a document and rebuild vector store from remaining documents"""
        document = self.get_object()
        document_title = document.title
        
        try:
            document.delete()
            
            remaining_docs = Document.objects.filter(user=request.user, processed=True)
            remaining_paths = [
                doc.file.path for doc in remaining_docs 
                if doc.file and os.path.exists(doc.file.path)
            ]
            
            rebuild_success = get_rag_service().rebuild_vector_store(remaining_paths)
            
            message = f'Document "{document_title}" deleted successfully! Vector store rebuilt with {len(remaining_paths)} document(s).'
            return Response({
                'message': message,
                'remaining_documents': len(remaining_paths)
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({'error': f'Error during document deletion: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        """Automatically set the user to the authenticated user."""
        serializer.save(user=self.request.user)



class QueryViewSet(viewsets.ViewSet):
    """
    ViewSet for handling user queries against uploaded documents.
    """
    permission_classes = [AllowAny]
    serializer_class = QuerySerializer  # Add this to fix the warning

    @extend_schema(
        summary="Submit a query",
        description="""
        Submit a text query to retrieve information from uploaded documents.
        
        **Process:**
        1. User submits a text query
        2. System processes the query against the vector store
        3. Returns the most relevant information found
        
        **Request:**
        - Field: `query` (required) - The text query to process
        
        **Authentication:**
        - Requires valid JWT access token
        """,
        request=QuerySerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
        }
    )
    @action(detail=False, methods=['post'])
    def ask(self, request):
        """Ask a question and get answer with source documents"""
        serializer = QuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        question = serializer.validated_data['question']
        
        try:
            result = get_rag_service().query(question)
            
            # Store only the answer text in history
            QueryHistory.objects.create(query=question, response=result['answer'])
            
            # Return clean response with answer and sources
            return Response({
                'question': question,
                'answer': result['answer'],
                'sources': result['sources']
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get query history"""
        queries = QueryHistory.objects.all().order_by('-created_at')[:20]
        return Response(QueryHistorySerializer(queries, many=True).data)
    
    @action(detail=False, methods=['delete'])
    def clear_history(self, request):
        """Clear query history"""
        QueryHistory.objects.all().delete()
        return Response({'message': 'History cleared'})


@api_view(['GET'])
@permission_classes([AllowAny])
def api_status(request):
    """API status"""
    return Response({
        'status': 'online',
        'message': 'RAG API is running',
        'version': '1.0'
    })
