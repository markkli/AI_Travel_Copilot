import hashlib
from pathlib import Path
from typing import Any

from app.core.config import Settings, get_settings
from app.schemas.retrieval import RetrievedChunk


class VectorStoreService:
    """Persists destination chunks and their vectors in a local Chroma database."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.persist_path = self._resolve_persist_path(self.settings.chroma_path)
        self._client: Any | None = None
        self._collection: Any | None = None

    @property
    def client(self) -> Any:
        if self._client is None:
            self._client = self._create_client()
        return self._client

    @property
    def collection(self) -> Any:
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=self.settings.chroma_collection,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def _create_client(self) -> Any:
        import chromadb

        if self.settings.chroma_mode == "http":
            return chromadb.HttpClient(
                host=self.settings.chroma_host,
                port=self.settings.chroma_port,
                ssl=self.settings.chroma_ssl,
            )

        self.persist_path.mkdir(parents=True, exist_ok=True)
        return chromadb.PersistentClient(path=str(self.persist_path))

    def upsert(
        self,
        chunks: list[RetrievedChunk],
        embeddings: list[list[float]],
    ) -> int:
        if len(chunks) != len(embeddings):
            raise ValueError("Each chunk must have exactly one embedding")
        if not chunks:
            return 0

        self.collection.upsert(
            ids=[self._chunk_id(chunk) for chunk in chunks],
            documents=[chunk.text for chunk in chunks],
            metadatas=[
                {"source": chunk.source, "heading": chunk.heading}
                for chunk in chunks
            ],
            embeddings=embeddings,
        )
        return len(chunks)

    def query(
        self,
        query_embedding: list[float],
        limit: int,
    ) -> list[RetrievedChunk]:
        if self.count() == 0:
            return []

        result = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(limit, self.count()),
            include=["documents", "metadatas", "distances"],
        )
        documents = self._first_result_list(result.get("documents"))
        metadatas = self._first_result_list(result.get("metadatas"))
        distances = self._first_result_list(result.get("distances"))

        chunks: list[RetrievedChunk] = []
        for document, metadata, distance in zip(documents, metadatas, distances):
            chunks.append(
                RetrievedChunk(
                    source=str(metadata["source"]),
                    heading=str(metadata["heading"]),
                    text=str(document),
                    score=max(0.0, 1.0 - float(distance)),
                )
            )
        return chunks

    def count(self) -> int:
        return self.collection.count()

    def reset(self) -> None:
        self.client.delete_collection(self.settings.chroma_collection)
        self._collection = self.client.get_or_create_collection(
            name=self.settings.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )

    def _resolve_persist_path(self, configured_path: str) -> Path:
        path = Path(configured_path)
        if path.is_absolute():
            return path
        return Path(__file__).resolve().parents[2] / path

    def _chunk_id(self, chunk: RetrievedChunk) -> str:
        content = f"{chunk.source}|{chunk.heading}|{chunk.text}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def _first_result_list(self, value: Any) -> list[Any]:
        if not value:
            return []
        return list(value[0])
