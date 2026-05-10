from fastapi import APIRouter

from app.schemas.trip import GenerateTripRequest, RefineTripRequest, TripPlan
from app.services.trip_service import TripService

router = APIRouter(prefix="/trip", tags=["trip"])
trip_service = TripService()


@router.post("/generate", response_model=TripPlan)
def generate_trip(request: GenerateTripRequest) -> TripPlan:
    return trip_service.generate_trip(request)


@router.post("/refine", response_model=TripPlan)
def refine_trip(request: RefineTripRequest) -> TripPlan:
    return trip_service.refine_trip(request)

