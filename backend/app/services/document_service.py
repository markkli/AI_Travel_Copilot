from pathlib import Path

from app.schemas.retrieval import RetrievedChunk


class DocumentService:
    """Loads destination markdown files into heading-sized retrieval chunks."""

    def __init__(self, docs_dir: Path | None = None) -> None:
        self.docs_dir = docs_dir or (
            Path(__file__).resolve().parents[1] / "data" / "destination_docs"
        )

    def load_chunks(self) -> list[RetrievedChunk]:
        if not self.docs_dir.exists():
            return []

        chunks: list[RetrievedChunk] = []
        for doc_path in sorted(self.docs_dir.glob("*.md")):
            chunks.extend(self.load_markdown_chunks(doc_path))
        return chunks

    def load_markdown_chunks(self, doc_path: Path) -> list[RetrievedChunk]:
        chunks: list[RetrievedChunk] = []
        current_heading = doc_path.stem.replace("_", " ").title()
        current_lines: list[str] = []

        for line in doc_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("## "):
                self._append_chunk(chunks, doc_path, current_heading, current_lines)
                current_heading = line.removeprefix("## ").strip()
                current_lines = []
            elif line and not line.startswith("# "):
                current_lines.append(line.strip())

        self._append_chunk(chunks, doc_path, current_heading, current_lines)
        return chunks

    def _append_chunk(
        self,
        chunks: list[RetrievedChunk],
        doc_path: Path,
        heading: str,
        lines: list[str],
    ) -> None:
        text = " ".join(lines).strip()
        if text:
            chunks.append(
                RetrievedChunk(
                    source=doc_path.name,
                    heading=heading,
                    text=text,
                )
            )
