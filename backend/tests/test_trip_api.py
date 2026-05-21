import os

from fastapi.testclient import TestClient

os.environ["LLM_MODE"] = "mock"

from app.core.config import get_settings

get_settings.cache_clear()

from app.main import app

client = TestClient(app)


def test_generate_trip_returns_structured_itinerary() -> None:
    response = client.post(
        "/trip/generate",
        json={
            "query": "I want a 3-day scenic trip in the Rocky Mountains with no long drives",
            "start_date": "2026-07-10",
            "end_date": "2026-07-12",
            "origin_location": "Denver, CO",
            "budget_level": "medium",
            "user_preferences": {
                "travel_styles": ["scenic", "photography", "low-driving"],
                "interests": ["astrophotography", "hidden trails"],
                "avoid": ["long drives"],
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["destination_region"] == "Rocky Mountains"
    assert len(data["days"]) == 3
    assert len(data["days"][0]["segments"]) > 1


def test_recommendations_return_lightweight_cards() -> None:
    response = client.get("/recommendations")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert "duration_days" in data[0]
    assert "days" not in data[0]


def test_generate_trip_supports_grand_teton_query() -> None:
    response = client.post(
        "/trip/generate",
        json={
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
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["destination_region"] == "Grand Teton National Park"
    assert len(data["days"]) == 4
    assert data["origin_location"] == "Jackson, WY"


def test_parse_trip_intent_endpoint_returns_structured_intent() -> None:
    response = client.post(
        "/trip/intent",
        json={
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
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["destination_region"] == "Grand Teton National Park"
    assert data["inferred_duration_days"] == 4
    assert data["travel_styles"] == ["photography", "wildlife", "scenic"]
    assert data["constraints"] == ["long drives"]

def test_normalize_trip_endpoint_fills_missing_defaults() -> None:
    response = client.post(
        "/trip/normalize",
        json={
            "query": "I want a scenic Alaska trip with low driving and good photography."
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "I want a scenic Alaska trip with low driving and good photography."
    assert data["budget_level"] == "medium"
    assert data["origin_location"] is None
    assert data["start_date"] is not None
    assert data["end_date"] is not None

def test_generate_trip_from_draft_endpoint_returns_itinerary() -> None:
    response = client.post(
        "/trip/generate-from-draft",
        json={
            "query": "I want a scenic Rocky Mountains trip with low driving and photography."
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["destination_region"] == "Rocky Mountains"
    assert data["budget_level"] == "medium"
    assert len(data["days"]) == 7
    assert len(data["days"][0]["segments"]) > 1
