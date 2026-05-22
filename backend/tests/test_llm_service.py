from app.schemas.common import BudgetLevel
from app.schemas.trip import GenerateTripRequest, TripDraftRequest
from app.services.llm_service import LLMService


def test_parse_trip_intent_extracts_structured_request() -> None:
    service = LLMService()

    request = GenerateTripRequest.model_validate(
        {
            "query": "I want a 4-day Grand Teton photography trip with wildlife and scenic viewpoints",
            "start_date": "2026-08-01",
            "end_date": "2026-08-04",
            "origin_location": "Jackson, WY",
            "budget_level": "medium",
            "user_preferences": {
                "travel_styles": ["photography", "wildlife", "scenic"],
                "interests": ["Jenny Lake", "Oxbow Bend", "sunrise viewpoints"],
                "avoid": ["long drives"],
            },
        }
    )

    intent = service.parse_trip_intent(request)

    assert intent.destination_region == "Grand Teton National Park"
    assert intent.inferred_duration_days == 4
    assert intent.travel_styles == ["photography", "wildlife", "scenic"]
    assert intent.interests == ["Jenny Lake", "Oxbow Bend", "sunrise viewpoints"]
    assert intent.constraints == ["long drives"]


def test_normalize_trip_request_fills_missing_defaults() -> None:
    service = LLMService()

    draft = TripDraftRequest.model_validate(
        {
            "query": "I want a scenic Alaska trip with low driving and good photography."
        }
    )

    normalized = service.normalize_trip_request(draft)

    assert normalized.query == draft.query
    assert normalized.budget_level == BudgetLevel.MEDIUM
    assert normalized.num_travelers == 2
    assert normalized.origin_location is None
    assert (normalized.end_date - normalized.start_date).days == 3
