from app.data.mock_recommendations import MOCK_RECOMMENDATION_CARDS
from app.schemas.recommendation import RecommendationCard


class RecommendationService:
    def list_cards(self) -> list[RecommendationCard]:
        return [RecommendationCard.model_validate(card) for card in MOCK_RECOMMENDATION_CARDS]

