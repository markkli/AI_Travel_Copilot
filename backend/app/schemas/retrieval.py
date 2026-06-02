from pydantic import BaseModel


class RetrievedChunk(BaseModel):
    source: str
    heading: str
    text: str
    score: float | None = None