from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.card import CardStep, NextCardsRequest, AlternativeSegmentsRequest, AlternativeSegmentsResponse
from app.schemas.trip import GenerateTripRequest, RefineTripRequest, TripDraftRequest, TripIntent, TripPlan
from app.services.trip_service import TripService

router = APIRouter(prefix="/trip", tags=["trip"])
trip_service = TripService()

@router.post("/normalize", response_model=GenerateTripRequest)
def normalize_trip_request(request: TripDraftRequest) -> GenerateTripRequest:
    return trip_service.normalize_trip_request(request)


@router.post("/intent", response_model=TripIntent)
def parse_trip_intent(request: GenerateTripRequest) -> TripIntent:
    return trip_service.parse_trip_intent(request)


@router.post("/generate", response_model=TripPlan)
def generate_trip(request: GenerateTripRequest) -> TripPlan:
    return trip_service.generate_trip(request)


@router.post("/generate-from-draft", response_model=TripPlan)
def generate_trip_from_draft(request: TripDraftRequest) -> TripPlan:
    return trip_service.generate_trip_from_draft(request)


@router.post("/generate-from-draft-stream")
def stream_trip_from_draft(request: TripDraftRequest) -> StreamingResponse:
    return StreamingResponse(
        trip_service.stream_trip_from_draft(request),
        media_type="text/event-stream",
    )


@router.post("/next-cards", response_model=CardStep)
def get_next_cards(request: NextCardsRequest) -> CardStep:
    return trip_service.get_next_cards(request)


@router.post("/suggest-alternatives", response_model=AlternativeSegmentsResponse)
def suggest_alternatives(request: AlternativeSegmentsRequest) -> AlternativeSegmentsResponse:
    return trip_service.suggest_alternative_segments(request)


@router.post("/refine", response_model=TripPlan)
def refine_trip(request: RefineTripRequest) -> TripPlan:
    return trip_service.refine_trip(request)
