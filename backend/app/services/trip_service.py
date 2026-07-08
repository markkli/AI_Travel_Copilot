import json
from collections.abc import Iterator

from app.prompts.itinerary_prompt import build_itinerary_prompt, build_refinement_prompt
from app.schemas.card import CardStep, NextCardsRequest, AlternativeSegmentsRequest, AlternativeSegmentsResponse, CustomCardRequest, CardOption
from app.schemas.trip import GenerateTripRequest, RefineTripRequest, TripDraftRequest, TripIntent, TripPlan
from app.services.llm_service import LLMService
from app.services.retrieval_service import RetrievalService


class TripService:
    def __init__(
        self,
        llm_service: LLMService | None = None,
        retrieval_service: RetrievalService | None = None,
    ) -> None:
        self.llm_service = llm_service or LLMService()
        self.retrieval_service = retrieval_service or RetrievalService()

    def normalize_trip_request(self, draft: TripDraftRequest) -> GenerateTripRequest:
        return self.llm_service.normalize_trip_request(draft)

    def parse_trip_intent(self, request: GenerateTripRequest) -> TripIntent:
        return self.llm_service.parse_trip_intent(request)

    def generate_trip(self, request: GenerateTripRequest) -> TripPlan:
        # Mock retrieval step; later this will query a vector database or travel knowledge source.
        context = self.retrieval_service.get_context(request.query)
        prompt = build_itinerary_prompt(request, context)
        return self.llm_service.generate_structured_trip(request, prompt)

    def generate_trip_from_draft(self, draft: TripDraftRequest) -> TripPlan:
        request = self.normalize_trip_request(draft)
        return self.generate_trip(request)

    def stream_trip_from_draft(self, draft: TripDraftRequest) -> Iterator[str]:
        yield self._sse("status", {"message": "Normalizing your travel request..."})
        request = self.normalize_trip_request(draft)

        yield self._sse("status", {"message": "Finding relevant travel context..."})
        context = self.retrieval_service.get_context(request.query)

        yield self._sse("status", {"message": "Building the itinerary prompt..."})
        prompt = build_itinerary_prompt(request, context)

        yield self._sse("status", {"message": "Generating a concise structured itinerary..."})
        trip_plan = self.llm_service.generate_structured_trip(request, prompt)

        yield self._sse("status", {"message": "Validating itinerary structure..."})
        validated_trip = TripPlan.model_validate(trip_plan.model_dump())

        yield self._sse("result", validated_trip.model_dump(mode="json"))

    def get_next_cards(self, request: NextCardsRequest) -> CardStep:
        return self.llm_service.generate_next_cards(request)

    def suggest_alternative_segments(self, request: AlternativeSegmentsRequest) -> AlternativeSegmentsResponse:
        return self.llm_service.suggest_alternative_segments(request)

    def generate_custom_card(self, request: CustomCardRequest) -> CardOption:
        return self.llm_service.generate_custom_card(request)

    def refine_trip(self, request: RefineTripRequest) -> TripPlan:
        prompt = build_refinement_prompt(request.existing_itinerary, request.user_feedback)
        return self.llm_service.refine_structured_trip(
            existing_plan=request.existing_itinerary,
            user_feedback=request.user_feedback,
            prompt=prompt,
        )

    def _sse(self, event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"
