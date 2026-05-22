from datetime import date
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import BudgetLevel, SegmentType


class UserPreferences(BaseModel):
    travel_styles: list[str] = Field(
        default_factory=list,
        examples=[["scenic", "photography", "hidden-gems", "low-driving"]],
    )
    pace: str | None = Field(default=None, examples=["relaxed", "balanced", "packed"])
    interests: list[str] = Field(default_factory=list, examples=[["astrophotography", "trails"]])
    avoid: list[str] = Field(default_factory=list, examples=[["long drives", "crowds"]])
    accessibility_notes: str | None = None

class TripDraftRequest(BaseModel):
    query: str = Field(
        min_length=3,
        examples=["I want a 7-day trip in the Rocky Mountains."],
    )
    start_date: date | None = None
    end_date: date | None = None
    origin_location: str | None = None
    budget_level: BudgetLevel | None = None
    num_travelers: int = Field(default=2, ge=1, le=20)
    user_preferences: UserPreferences = Field(default_factory=UserPreferences)


class TripIntent(BaseModel):
    destination_region: str
    inferred_duration_days: int = Field(ge=1)
    travel_styles: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)

class GenerateTripRequest(BaseModel):
    query: str = Field(
        min_length=3,
        examples=[
            "I want a 7-day scenic trip in the Rocky Mountains with no long drives, good for astrophotography, hidden trails, and medium budget."
        ],
    )
    start_date: date
    end_date: date
    origin_location: str | None = Field(default=None, examples=["Denver, CO"])
    budget_level: BudgetLevel | None = BudgetLevel.MEDIUM
    num_travelers: int = Field(default=2, ge=1, le=20)
    user_preferences: UserPreferences = Field(default_factory=UserPreferences)

    @model_validator(mode="after")
    def validate_date_range(self) -> "GenerateTripRequest":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class ItinerarySegment(BaseModel):
    sequence: int = Field(ge=1)
    segment_type: SegmentType
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$", examples=["09:30"])
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$", examples=["11:00"])
    origin: str | None = None
    destination: str | None = None
    description: str
    estimated_travel_time: str | None = None
    estimated_distance: str | None = None
    why_recommended: str | None = None
    cost_estimate: str | None = None
    food_recommendation: str | None = None
    photo_query: str | None = None
    image_url: str | None = None
    tips: list[str] = Field(default_factory=list)
    constraints_satisfied: list[str] = Field(default_factory=list)


class TripDay(BaseModel):
    day_number: int = Field(ge=1)
    date: date
    theme: str
    starting_location: str
    ending_location: str
    estimated_total_drive_time: str | None = None
    estimated_total_walking_time: str | None = None
    estimated_total_distance: str | None = None
    summary: str
    segments: list[ItinerarySegment] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_segment_sequence(self) -> "TripDay":
        sequence_numbers = [segment.sequence for segment in self.segments]

        expected_sequence = list(range(1, len(sequence_numbers) + 1))
        if sequence_numbers != expected_sequence:
            raise ValueError(f"Segment sequence must be in order: {expected_sequence}")
        return self


class TripPlan(BaseModel):
    trip_title: str
    origin_location: str | None = None
    destination_region: str
    start_date: date
    end_date: date
    travel_style: list[str] = Field(default_factory=list)
    budget_level: BudgetLevel
    num_travelers: int = Field(default=2, ge=1, le=20)
    estimated_total_cost_range: str | None = None
    summary: str
    days: list[TripDay] = Field(min_length=1)


class RefineTripRequest(BaseModel):
    existing_itinerary: TripPlan
    user_feedback: str = Field(
        min_length=3,
        examples=["Make this less driving-heavy and add more underrated trails."],
    )
