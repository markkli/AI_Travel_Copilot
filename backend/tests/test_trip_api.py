from fastapi.testclient import TestClient

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

