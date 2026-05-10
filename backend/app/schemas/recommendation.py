from pydantic import BaseModel, Field

from app.schemas.common import BudgetLevel


class RecommendationCard(BaseModel):
    id: str
    title: str
    destination_region: str
    duration_days: int = Field(ge=1)
    short_description: str
    travel_styles: list[str]
    budget_level: BudgetLevel
    best_season: str | None = None
    preview_image_query: str | None = None

