from pathlib import Path

from app.data.mock_context import get_mock_context


class RetrievalService:
    def __init__(self, docs_dir: Path | None = None) -> None:
        self.docs_dir = docs_dir or Path(__file__).resolve().parents[1] / "data" / "destination_docs"

    def get_context(self, query: str) -> dict:
        base_context = get_mock_context(query)
        doc_chunks = self._retrieve_doc_chunks(query)

        if not doc_chunks:
            return base_context

        return {
            **base_context,
            "retrieved_chunks": doc_chunks,
        }

    def _retrieve_doc_chunks(self, query: str, limit: int = 3) -> list[dict[str, str]]:
        if not self.docs_dir.exists():
            return []

        query_terms = self._tokenize(query)
        scored_chunks = []

        for doc_path in self.docs_dir.glob("*.md"):
            for chunk in self._load_markdown_chunks(doc_path):
                chunk_terms = self._tokenize(chunk["text"])
                score = len(query_terms.intersection(chunk_terms))
                if score > 0:
                    scored_chunks.append((score, chunk))

        scored_chunks.sort(key=lambda item: item[0], reverse=True)
        return [chunk for _, chunk in scored_chunks[:limit]]

    def _load_markdown_chunks(self, doc_path: Path) -> list[dict[str, str]]:
        chunks = []
        current_heading = doc_path.stem.replace("_", " ").title()
        current_lines = []

        for line in doc_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("## "):
                if current_lines:
                    chunks.append(
                        {
                            "source": doc_path.name,
                            "heading": current_heading,
                            "text": " ".join(current_lines).strip(),
                        }
                    )
                current_heading = line.removeprefix("## ").strip()
                current_lines = []
            elif line and not line.startswith("# "):
                current_lines.append(line.strip())

        if current_lines:
            chunks.append(
                {
                    "source": doc_path.name,
                    "heading": current_heading,
                    "text": " ".join(current_lines).strip(),
                }
            )

        return chunks

    def _tokenize(self, text: str) -> set[str]:
        normalized = "".join(char.lower() if char.isalnum() else " " for char in text)
        return {token for token in normalized.split() if len(token) > 2}
