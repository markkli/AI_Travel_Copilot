from datetime import date
from pydantic import BaseModel, Field
from app.schemas.common import BudgetLevel, SegmentType


class CardOptionLLM(BaseModel):
    title: str = Field(description="Vivid day title (5-9 words, e.g. 'Denali backcountry hike and ranger talk')")
    description: str = Field(description="1 sentence: key highlights of this day's experience")
    segment_type: SegmentType
    duration_hours: float = Field(ge=4.0, le=16.0, description="Total hours this day experience takes")
    next_location: str = Field(description="Primary location the traveler ends up at by end of this day")
    lat: float = Field(description="Approximate latitude of next_location (geographically accurate)")
    lng: float = Field(description="Approximate longitude of next_location (geographically accurate)")
    tags: list[str] = Field(default_factory=list, max_length=3)


class CardStepLLM(BaseModel):
    context: str = Field(description="One vivid sentence: where the traveler is now and what just happened")
    prompt: str = Field(description="The day-planning question for the traveler (1 sentence, second person)")
    options: list[CardOptionLLM] = Field(min_length=3, max_length=3, description="Exactly 3 meaningfully different ways to spend this day")
    is_final_step: bool = Field(description="True if this is the last day to plan before itinerary assembly")
    estimated_remaining_steps: int = Field(default=3, ge=0)


class CardOption(CardOptionLLM):
    id: str  # "a", "b", "c" — added by the API layer


class CardStep(BaseModel):
    step_number: int
    context: str
    prompt: str
    options: list[CardOption]
    is_final_step: bool
    estimated_remaining_steps: int


class ChoiceMade(BaseModel):
    step: int
    card_id: str
    title: str
    description: str
    segment_type: str
    duration_hours: float
    next_location: str
    lat: float = 0.0
    lng: float = 0.0


class NextCardsRequest(BaseModel):
    destination: str = Field(min_length=2)
    origin: str | None = None
    start_date: date
    end_date: date
    num_travelers: int = Field(default=2, ge=1, le=20)
    budget_level: BudgetLevel = BudgetLevel.MEDIUM
    trip_scale: str = "regional"  # "city", "regional", "international"
    vibes: list[str] = Field(default_factory=list)
    choices_made: list[ChoiceMade] = Field(default_factory=list)
    current_day: int = Field(default=1, ge=1)
    current_location: str = ""
