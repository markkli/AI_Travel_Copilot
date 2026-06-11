import hashlib
import math
import re

from app.core.config import Settings, get_settings


class EmbeddingService:
    """Turns text into vectors using OpenAI or a deterministic local fallback."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def embed_text(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        if self.settings.embedding_mode == "openai":
            return self._embed_with_openai(texts)

        return [self._embed_locally(text) for text in texts]

    def _embed_with_openai(self, texts: list[str]) -> list[list[float]]:
        if not self.settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when EMBEDDING_MODE=openai")

        from openai import OpenAI

        client = OpenAI(api_key=self.settings.openai_api_key)
        response = client.embeddings.create(
            model=self.settings.openai_embedding_model,
            input=texts,
        )
        ordered_data = sorted(response.data, key=lambda item: item.index)
        return [item.embedding for item in ordered_data]

    def _embed_locally(self, text: str) -> list[float]:
        dimensions = self.settings.mock_embedding_dimensions
        vector = [0.0] * dimensions
        tokens = re.findall(r"[a-z0-9]+", text.lower())

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            return vector

        return [value / magnitude for value in vector]
