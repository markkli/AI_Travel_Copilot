from datetime import date
from pydantic import BaseModel, Field
from app.schemas.common import BudgetLevel, SegmentType


class CardOptionLLM(BaseModel):
    title: str = Field(description="Short, punchy title (3-7 words)")
    description: str = Field(description="What this option involves (1-2 sentences)")
    segment_type: SegmentType
    duration_hours: float = Field(ge=0.5, le=8, description="How many hours this takes")
    next_location: str = Field(description="Where the traveler ends up after this choice")
    tags: list[str] = Field(default_factory=list, max_length=3)


class CardStepLLM(BaseModel):
    context: str = Field(description="Vivid 1-2 sentence scene-setter: current day, time, location, and what just happened")
    prompt: str = Field(description="The decision question for the traveler (1 sentence, second person)")
    options: list[CardOptionLLM] = Field(min_length=3, max_length=3, description="Exactly 3 meaningfully different options")
    is_final_step: bool = Field(description="True if this is the last decision before itinerary assembly")
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


class NextCardsRequest(BaseModel):
    destination: str = Field(min_length=2)
    origin: str | None = None
    start_date: date
    end_date: date
    num_travelers: int = Field(default=2, ge=1, le=20)
    budget_level: BudgetLevel = BudgetLevel.MEDIUM
    choices_made: list[ChoiceMade] = Field(default_factory=list)
    current_day: int = Field(default=1, ge=1)
    current_time: str = "14:00"
    current_location: str = ""
