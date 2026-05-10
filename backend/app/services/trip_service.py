from app.data.mock_context import get_mock_context
from app.prompts.itinerary_prompt import build_itinerary_prompt, build_refinement_prompt
from app.schemas.trip import GenerateTripRequest, RefineTripRequest, TripPlan
from app.services.llm_service import LLMService


class TripService:
    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    def generate_trip(self, request: GenerateTripRequest) -> TripPlan:
        context = get_mock_context(request.query)
        prompt = build_itinerary_prompt(request, context)
        return self.llm_service.generate_structured_trip(request, prompt)

    def refine_trip(self, request: RefineTripRequest) -> TripPlan:
        prompt = build_refinement_prompt(request.existing_itinerary, request.user_feedback)
        return self.llm_service.refine_structured_trip(
            existing_plan=request.existing_itinerary,
            user_feedback=request.user_feedback,
            prompt=prompt,
        )

