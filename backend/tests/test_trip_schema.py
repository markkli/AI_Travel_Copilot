import pytest
from pydantic import ValidationError

from app.schemas.trip import GenerateTripRequest, TripDay


def test_generate_trip_request_rejects_end_date_before_start_date() -> None:
    with pytest.raises(ValidationError):
        GenerateTripRequest.model_validate(
            {
                "query": "Plan a scenic Amsterdam trip",
                "start_date": "2026-07-10",
                "end_date": "2026-07-09",
            }
        )


def test_trip_day_accepts_ordered_segment_sequence() -> None:
    trip_day = TripDay.model_validate(
        {
            "day_number": 1,
            "date": "2026-07-10",
            "theme": "Arrival",
            "starting_location": "Denver",
            "ending_location": "Estes Park",
            "summary": "A simple arrival day.",
            "segments": [
                {
                    "sequence": 1,
                    "segment_type": "meal",
                    "start_time": "08:00",
                    "end_time": "09:00",
                    "description": "Breakfast",
                },
                {
                    "sequence": 2,
                    "segment_type": "activity",
                    "start_time": "09:30",
                    "end_time": "11:00",
                    "description": "Short scenic walk",
                },
            ],
        }
    )

    assert trip_day.day_number == 1
    assert len(trip_day.segments) == 2


def test_trip_day_rejects_missing_segment_sequence_number() -> None:
    with pytest.raises(ValidationError):
        TripDay.model_validate(
            {
                "day_number": 1,
                "date": "2026-07-10",
                "theme": "Arrival",
                "starting_location": "Denver",
                "ending_location": "Estes Park",
                "summary": "A broken timeline.",
                "segments": [
                    {
                        "sequence": 1,
                        "segment_type": "meal",
                        "start_time": "08:00",
                        "end_time": "09:00",
                        "description": "Breakfast",
                    },
                    {
                        "sequence": 3,
                        "segment_type": "activity",
                        "start_time": "09:30",
                        "end_time": "11:00",
                        "description": "Short scenic walk",
                    },
                ],
            }
        )

