from app.data.mock_context import get_mock_context


class RetrievalService:
    def get_context(self, query: str) -> dict:
        return get_mock_context(query)
