import os,logging
from django.conf import settings
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from langchain_community.document_loaders import TextLoader,PyPDFLoader,Docx2txtLoader


logger = logging.getLogger(__name__)

class RAGService:

    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.vector_store_path = str(settings.VECTOR_DB_PATH)

        # Create vector store directory if it doesn't exist
        os.makedirs(self.vector_store_path, exist_ok=True)

        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

        self.vector_store = None
        self._load_vector_store()


    def _load_vector_store(self):
        try:
            if os.path.exists(os.path.join(self.vector_store_path, "index.faiss")):
                self.vector_store = FAISS.load_local(
                    self.vector_store_path, 
                    self.embeddings,
                    allow_dangerous_deserialization=True
                    )
                logger.info("Vector store loaded successfully.")
            else:
                # Suppress warning on initialization - vector store will be created on first upload
                logger.debug("Vector store not found. Will be created when first document is uploaded.")
        except Exception as e:
            logger.error(f"Error loading vector store: {e}")
            self.vector_store = None

    def process_document(self, file_path: str) -> bool:
        """
        Process a document and add it to the vector store.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            bool: True if processing succeeded, False otherwise
        """
        try:
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return False
            
            # Load document using appropriate loader
            documents = self._load_document(file_path)
            if not documents:
                logger.warning(f"No content loaded from {file_path}")
                return False
            
            # Split into chunks
            chunks = self._split_documents(documents)
            if not chunks:
                logger.warning("No text chunks created from the document.")
                return False
            
            # Add to vector store
            self._add_to_vector_store(chunks)
            
            # Save to disk
            self._save_vector_store()
            
            logger.info("Document processed and vector store updated successfully.")
            return True
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            return False
    
    def _load_document(self, file_path: str) -> list:
        """Load document based on file extension."""
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension == ".txt":
            loader = TextLoader(file_path)
        elif file_extension == ".pdf":
            loader = PyPDFLoader(file_path)
        elif file_extension == ".docx":
            loader = Docx2txtLoader(file_path)
        else:
            logger.error(f"Unsupported file format: {file_extension}")
            return []
        
        return loader.load()
    
    def _split_documents(self, documents: list) -> list:
        """Split documents into chunks."""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""],
            length_function=len
        )
        return text_splitter.split_documents(documents)
    
    def _add_to_vector_store(self, chunks: list):
        """Add chunks to vector store."""
        if self.vector_store is None:
            self.vector_store = FAISS.from_documents(chunks, self.embeddings)
        else:
            new_vector_store = FAISS.from_documents(chunks, self.embeddings)
            self.vector_store.merge_from(new_vector_store)
    
    def _save_vector_store(self):
        """Save vector store to disk."""
        os.makedirs(self.vector_store_path, exist_ok=True)
        self.vector_store.save_local(self.vector_store_path)
        

    def query(self, question: str) -> dict:
        """
        Query the vector store and return answer with source documents.
        
        Returns:
            dict with 'answer' (str) and 'sources' (list of source documents)
        """
        try:
            self._load_vector_store()

            if self.vector_store is None:
                return {
                    "answer": "Hello! I'm the GUCC AI Assistant. I apologize, but I currently don't have sufficient information in my knowledge base to answer your question about Green University Computer Club. Please feel free to contact GUCC directly for more details.",
                    "sources": []
                }
            

            llm = ChatGroq(
                groq_api_key=self.groq_api_key,
                model_name = "llama-3.3-70b-versatile",
                temperature=0.2,
            )

            prompt_template = """You are GUCC AI Assistant, an intelligent and helpful assistant for Green University Computer Club (GUCC). 
            Your role is to provide accurate and friendly answers to questions about GUCC based on the provided context.
            
            Guidelines:
            - Answer questions professionally and warmly
            - Use only the information provided in the context
            - If the answer is not in the context, politely say: "I apologize, but I don't have that specific information about GUCC in my current knowledge base. Please feel free to contact GUCC directly for more details."
            - Be concise but informative
            - Maintain a helpful and encouraging tone
            """

            PROMPT = PromptTemplate(
                template=prompt_template + "\n\n{context}\n\nQuestion: {question}\nHelpful Answer:",
                input_variables=["context", "question"]
            )


            qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=self.vector_store.as_retriever(
                    search_kwargs={"k": 3}
                ),
                chain_type_kwargs={"prompt": PROMPT},
                return_source_documents=True
            )
            

            result = qa_chain({"query": question})
            
            # Extract answer text and source documents
            answer_text = result.get('result', '')
            source_docs = result.get('source_documents', [])
            
            # Extract only document names from sources
            sources = []
            seen_sources = set()  # Avoid duplicates
            for doc in source_docs:
                # Get document filename from metadata
                source_file = doc.metadata.get('source', 'Unknown')
                # Extract just the filename
                import os
                filename = os.path.basename(source_file)
                
                if filename not in seen_sources:
                    sources.append(filename)
                    seen_sources.add(filename)
            
            return {
                "answer": answer_text,
                "sources": sources  # Just list of filenames
            }
        

        except Exception as e:
            logger.error(f"Error during query processing: {e}")
            return {
                "answer": "We apologize for the inconvenience. An unexpected error occurred while processing your request. Please try again later or contact support if the issue persists.",
                "sources": []
            }


    def clear_database(self):
        """Clear the entire vector database."""
        try:
            self.vector_store = None

            if os.path.exists(self.vector_store_path):
                import shutil
                shutil.rmtree(self.vector_store_path)
                os.makedirs(self.vector_store_path, exist_ok=True)
            
            logger.info("Vector database cleared successfully.")
            return True
        except Exception as e:
            logger.error(f"Error clearing vector database: {e}")
            return False
    
    def rebuild_vector_store(self, document_paths: list) -> bool:
        """Rebuild vector store from scratch using provided document paths."""
        try:
            logger.info(f"Rebuilding vector store with {len(document_paths)} documents")
            
            self.clear_database()
            
            if not document_paths:
                logger.info("No documents to process. Vector store cleared.")
                return True
            
            for file_path in document_paths:
                if not os.path.exists(file_path):
                    logger.warning(f"File not found: {file_path}")
                    continue
                
                success = self.process_document(file_path)
                if not success:
                    logger.warning(f"Failed to process {file_path}")
            
            logger.info("Vector store rebuilt successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error rebuilding vector store: {e}")
            return False