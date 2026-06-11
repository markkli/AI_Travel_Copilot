from pathlib import Path

import pytest

from app.core.config import Settings
from app.services.document_service import DocumentService
from app.services.embedding_service import EmbeddingService
from app.services.rag_ingestion_service import RAGIngestionService
from app.services.retrieval_service import RetrievalService
from app.services.vector_store_service import VectorStoreService


def make_settings(chroma_path: Path) -> Settings:
    return Settings(
        embedding_mode="mock",
        chroma_path=str(chroma_path),
        chroma_collection="test_destination_docs",
        mock_embedding_dimensions=128,
        retrieval_top_k=2,
        retrieval_min_score=0.1,
    )


def test_mock_embeddings_are_deterministic_and_normalized(tmp_path: Path) -> None:
    service = EmbeddingService(make_settings(tmp_path / "chroma"))

    first = service.embed_text("Alaska wildlife photography")
    second = service.embed_text("Alaska wildlife photography")

    assert first == second
    assert len(first) == 128
    assert sum(value * value for value in first) == pytest.approx(1.0)


def test_rag_pipeline_indexes_and_retrieves_destination_chunks(
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "alaska.md").write_text(
        "# Alaska\n\n"
        "## Seward Wildlife\n"
        "Visit Seward for whale watching, puffins, and coastal photography.\n\n"
        "## Denali Transit\n"
        "Use the park shuttle to reduce driving and look for bears and moose.\n",
        encoding="utf-8",
    )

    settings = make_settings(tmp_path / "chroma")
    documents = DocumentService(docs_dir)
    embeddings = EmbeddingService(settings)
    vector_store = VectorStoreService(settings)
    ingestion = RAGIngestionService(documents, embeddings, vector_store)

    indexed_count = ingestion.rebuild_index()
    retrieval = RetrievalService(
        settings=settings,
        document_service=documents,
        embedding_service=embeddings,
        vector_store=vector_store,
    )
    context = retrieval.get_context(
        "Where should I go for whale watching and coastal photography?"
    )

    assert indexed_count == 2
    assert vector_store.count() == 2
    assert context["retrieved_chunks"][0]["heading"] == "Seward Wildlife"
    assert context["retrieved_chunks"][0]["score"] > 0


def test_retrieval_uses_keyword_fallback_before_indexing(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "utah.md").write_text(
        "# Utah\n\n"
        "## Goblin Valley\n"
        "Photograph unusual rock formations with smaller crowds.\n",
        encoding="utf-8",
    )

    settings = make_settings(tmp_path / "chroma")
    retrieval = RetrievalService(
        settings=settings,
        document_service=DocumentService(docs_dir),
        embedding_service=EmbeddingService(settings),
        vector_store=VectorStoreService(settings),
    )

    context = retrieval.get_context("Utah rock formations without crowds")

    assert context["retrieved_chunks"][0]["heading"] == "Goblin Valley"
    assert context["retrieved_chunks"][0]["score"] >= 1


def test_keyword_fallback_ignores_unrelated_stop_word_matches(
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "alaska.md").write_text(
        "# Alaska\n\n"
        "## Wildlife\n"
        "Whales and puffins are visible near Seward.\n",
        encoding="utf-8",
    )

    settings = make_settings(tmp_path / "chroma")
    retrieval = RetrievalService(
        settings=settings,
        document_service=DocumentService(docs_dir),
        embedding_service=EmbeddingService(settings),
        vector_store=VectorStoreService(settings),
    )

    context = retrieval.get_context("Amsterdam museums and canals")

    assert "retrieved_chunks" not in context
