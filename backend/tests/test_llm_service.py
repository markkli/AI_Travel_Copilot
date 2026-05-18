from app.schemas.trip import GenerateTripRequest
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
