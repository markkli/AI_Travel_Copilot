from app.core.config import get_settings
from app.services.rag_ingestion_service import RAGIngestionService


def main() -> None:
    settings = get_settings()
    indexed_count = RAGIngestionService().rebuild_index()
    location = (
        f"{settings.chroma_host}:{settings.chroma_port}"
        if settings.chroma_mode == "http"
        else settings.chroma_path
    )
    print(
        f"Indexed {indexed_count} destination chunks into "
        f"'{settings.chroma_collection}' at {location} "
        f"using {settings.embedding_mode} embeddings."
    )


if __name__ == "__main__":
    main()
