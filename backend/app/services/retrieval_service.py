from pathlib import Path

from app.core.config import Settings, get_settings
from app.data.mock_context import get_mock_context
from app.schemas.retrieval import RetrievedChunk
from app.services.document_service import DocumentService
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService


class RetrievalService:
    STOP_WORDS = {
        "and",
        "are",
        "for",
        "from",
        "into",
        "near",
        "not",
        "the",
        "this",
        "trip",
        "with",
        "without",
    }

    def __init__(
        self,
        docs_dir: Path | None = None,
        settings: Settings | None = None,
        document_service: DocumentService | None = None,
        embedding_service: EmbeddingService | None = None,
        vector_store: VectorStoreService | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.document_service = document_service or DocumentService(docs_dir)
        self.embedding_service = embedding_service or EmbeddingService(self.settings)
        self.vector_store = vector_store or VectorStoreService(self.settings)

    def get_context(self, query: str) -> dict:
        base_context = get_mock_context(query)
        doc_chunks = self._retrieve_doc_chunks(
            query,
            limit=self.settings.retrieval_top_k,
        )

        if not doc_chunks:
            return base_context

        return {
            **base_context,
            "retrieved_chunks": [chunk.model_dump() for chunk in doc_chunks],
        }

    def _retrieve_doc_chunks(self, query: str, limit: int = 3) -> list[RetrievedChunk]:
        semantic_chunks = self.vector_store.query(
            self.embedding_service.embed_text(query),
            limit=limit,
        )
        semantic_chunks = [
            chunk
            for chunk in semantic_chunks
            if chunk.score is not None
            and chunk.score >= self.settings.retrieval_min_score
        ]
        if semantic_chunks:
            return semantic_chunks

        query_terms = self._tokenize(query)
        scored_chunks: list[tuple[int, RetrievedChunk]] = []

        for chunk in self.document_service.load_chunks():
            chunk_terms = self._tokenize(f"{chunk.heading} {chunk.text}")
            score = len(query_terms.intersection(chunk_terms))
            if score > 0:
                scored_chunks.append(
                    (score, chunk.model_copy(update={"score": float(score)}))
                )

        scored_chunks.sort(key=lambda item: item[0], reverse=True)
        return [chunk for _, chunk in scored_chunks[:limit]]

    def _tokenize(self, text: str) -> set[str]:
        normalized = "".join(char.lower() if char.isalnum() else " " for char in text)
        return {
            token
            for token in normalized.split()
            if len(token) > 2 and token not in self.STOP_WORDS
        }
