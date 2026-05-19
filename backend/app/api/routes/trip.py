from fastapi import APIRouter
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


@router.post("/refine", response_model=TripPlan)
def refine_trip(request: RefineTripRequest) -> TripPlan:
    return trip_service.refine_trip(request)