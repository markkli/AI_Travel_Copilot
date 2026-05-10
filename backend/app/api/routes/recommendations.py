from fastapi import APIRouter

from app.schemas.recommendation import RecommendationCard
from app.services.recommendation_service import RecommendationService

router = APIRouter(tags=["recommendations"])
recommendation_service = RecommendationService()


@router.get("/recommendations", response_model=list[RecommendationCard])
def list_recommendations() -> list[RecommendationCard]:
    return recommendation_service.list_cards()

