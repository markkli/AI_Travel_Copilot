from app.services.document_service import DocumentService
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService


class RAGIngestionService:
    """Builds a searchable vector index from the destination knowledge files."""

    def __init__(
        self,
        document_service: DocumentService | None = None,
        embedding_service: EmbeddingService | None = None,
        vector_store: VectorStoreService | None = None,
    ) -> None:
        self.document_service = document_service or DocumentService()
        self.embedding_service = embedding_service or EmbeddingService()
        self.vector_store = vector_store or VectorStoreService()

    def rebuild_index(self) -> int:
        chunks = self.document_service.load_chunks()
        searchable_texts = [
            f"{chunk.heading}\n{chunk.text}"
            for chunk in chunks
        ]
        embeddings = self.embedding_service.embed_texts(searchable_texts)

        self.vector_store.reset()
        return self.vector_store.upsert(chunks, embeddings)
