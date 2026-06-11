from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "local"
    llm_mode: Literal["mock", "openai"] = "mock"
    embedding_mode: Literal["mock", "openai"] = "mock"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    openai_normalization_model: str = "gpt-4.1-nano"
    openai_embedding_model: str = "text-embedding-3-small"
    mock_embedding_dimensions: int = 128
    chroma_mode: Literal["persistent", "http"] = "persistent"
    chroma_path: str = "data/chroma"
    chroma_host: str = "localhost"
    chroma_port: int = 8100
    chroma_ssl: bool = False
    chroma_collection: str = "destination_docs"
    retrieval_top_k: int = 3
    retrieval_min_score: float = 0.15


@lru_cache
def get_settings() -> Settings:
    return Settings()
