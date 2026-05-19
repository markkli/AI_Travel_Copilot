from datetime import timedelta, date
from app.core.config import Settings, get_settings
from app.schemas.common import BudgetLevel, SegmentType
from app.schemas.trip import GenerateTripRequest, TripDraftRequest, TripIntent, TripPlan


class LLMService:
    """Small boundary around itinerary generation.

    The MVP returns deterministic mock data so the API can run with no paid LLM calls.
    Later, this class can dispatch to OpenAI or another provider and validate the JSON.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def normalize_trip_request(self, draft: TripDraftRequest) -> GenerateTripRequest:
        start_date = draft.start_date or (date.today() + timedelta(days=30))
        end_date = draft.end_date or (start_date + timedelta(days=6))

        return GenerateTripRequest(
            query=draft.query,
            start_date=start_date,
            end_date=end_date,
            origin_location=draft.origin_location,
            budget_level=draft.budget_level or BudgetLevel.MEDIUM,
            user_preferences=draft.user_preferences,
        )

    def generate_structured_trip(self, request: GenerateTripRequest, prompt: str) -> TripPlan:
        if self.settings.llm_mode == "openai":
            return self._generate_with_openai(prompt)
        return self._mock_trip_plan(request)

    def parse_trip_intent(self, request: GenerateTripRequest) -> TripIntent:
        trip_length = (request.end_date - request.start_date).days + 1

        return TripIntent(
            destination_region=self._infer_destination_region(request.query),
            inferred_duration_days=trip_length,
            travel_styles=request.user_preferences.travel_styles or [
                "scenic",
                "nature",
                "structured",
                "logistics-aware",
            ],
            constraints=request.user_preferences.avoid,
            interests=request.user_preferences.interests,
        )

    def refine_structured_trip(self, existing_plan: TripPlan, user_feedback: str, prompt: str) -> TripPlan:
        refined_plan = existing_plan.model_copy(deep=True)
        refined_plan.summary = f"{existing_plan.summary} Revised based on feedback: {user_feedback}"
        refined_plan.travel_style = sorted(set(refined_plan.travel_style + ["refined"]))

        for day in refined_plan.days:
            day.summary = f"{day.summary} Adjusted to better match: {user_feedback}"
            day.estimated_total_drive_time = "Reduced where possible"
            for segment in day.segments:
                if segment.segment_type == SegmentType.DRIVE:
                    segment.tips.append("Consider alternate lodging or route timing to reduce driving pressure.")
                    segment.constraints_satisfied.append("less driving")
                if segment.segment_type in {SegmentType.ACTIVITY, SegmentType.VIEWPOINT}:
                    segment.constraints_satisfied.append("refined preference")

        return TripPlan.model_validate(refined_plan.model_dump())

    def _generate_with_openai(self, prompt: str) -> TripPlan:
        if not self.settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY must be set when LLM_MODE=openai")

        from openai import OpenAI

        client = OpenAI(api_key=self.settings.openai_api_key)
        completion = client.beta.chat.completions.parse(
            model=self.settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a travel-planning engine. Return a complete, logistics-aware "
                        "itinerary that matches the TripPlan schema exactly."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format=TripPlan,
        )

        parsed_plan = completion.choices[0].message.parsed
        if parsed_plan is None:
            raise ValueError("OpenAI response did not contain a parsed TripPlan")

        return TripPlan.model_validate(parsed_plan.model_dump())

    def _mock_trip_plan(self, request: GenerateTripRequest) -> TripPlan:
        intent = self.parse_trip_intent(request)
        destination_region = intent.destination_region
        origin = request.origin_location or "Flexible origin"
        budget = request.budget_level or BudgetLevel.MEDIUM
        travel_style = intent.travel_styles
        trip_length = intent.inferred_duration_days

        days = []
        for index in range(trip_length):
            current_date = request.start_date + timedelta(days=index)
            day_number = index + 1
            base_area = "Estes Park" if destination_region == "Rocky Mountains" else destination_region
            theme = "Arrival and gentle scenic introduction" if day_number == 1 else "Low-driving exploration and local highlights"

            days.append(
                {
                    "day_number": day_number,
                    "date": current_date,
                    "theme": theme,
                    "starting_location": origin if day_number == 1 else base_area,
                    "ending_location": base_area,
                    "estimated_total_drive_time": "2 hr 10 min" if day_number == 1 else "1 hr 15 min",
                    "estimated_total_walking_time": "1-2 hr",
                    "estimated_total_distance": "80 miles" if day_number == 1 else "35 miles",
                    "summary": f"Structured day {day_number} for {destination_region} with scenic pacing and practical buffers.",
                    "segments": self._mock_segments(day_number, origin, base_area, destination_region),
                }
            )

        return TripPlan.model_validate(
            {
                "trip_title": f"{trip_length}-Day {destination_region} Travel Plan",
                "origin_location": origin,
                "destination_region": destination_region,
                "start_date": request.start_date,
                "end_date": request.end_date,
                "travel_style": travel_style,
                "budget_level": budget,
                "summary": "A mock structured itinerary generated from local schemas and placeholder context.",
                "days": days,
            }
        )

    def _mock_segments(self, day_number: int, origin: str, base_area: str, destination_region: str) -> list[dict]:
        if day_number == 1:
            return [
                {
                    "sequence": 1,
                    "segment_type": SegmentType.ARRIVAL,
                    "start_time": "10:00",
                    "end_time": "11:00",
                    "origin": origin,
                    "destination": origin,
                    "description": "Arrive, collect bags, and orient around the day plan.",
                    "cost_estimate": "$0-$80 depending on rental or transit needs",
                    "tips": ["Confirm lodging check-in timing", "Check weather before leaving the arrival area"],
                    "constraints_satisfied": ["arrival logistics"],
                },
                {
                    "sequence": 2,
                    "segment_type": SegmentType.DRIVE,
                    "start_time": "11:15",
                    "end_time": "13:00",
                    "origin": origin,
                    "destination": base_area,
                    "description": f"Transfer from {origin} to {base_area} with a simple route and one optional rest stop.",
                    "estimated_travel_time": "1 hr 45 min",
                    "estimated_distance": "75 miles",
                    "why_recommended": "Keeps the arrival day practical while still moving into the destination region.",
                    "tips": ["Avoid peak traffic if possible"],
                    "constraints_satisfied": ["low complexity", "arrival friendly"],
                },
                {
                    "sequence": 3,
                    "segment_type": SegmentType.MEAL,
                    "start_time": "13:15",
                    "end_time": "14:15",
                    "origin": base_area,
                    "destination": "Local restaurant area",
                    "description": "Casual lunch near the lodging area.",
                    "food_recommendation": "Casual local cafe or sandwich shop",
                    "cost_estimate": "$15-$30",
                    "tips": ["Keep the meal flexible in case arrival timing slips"],
                    "constraints_satisfied": ["medium budget"],
                },
                {
                    "sequence": 4,
                    "segment_type": SegmentType.ACTIVITY,
                    "start_time": "15:00",
                    "end_time": "17:00",
                    "origin": base_area,
                    "destination": f"{destination_region} scenic viewpoint",
                    "description": "Short scenic walk and first photography stop.",
                    "estimated_travel_time": "30 min drive",
                    "estimated_distance": "12 miles",
                    "why_recommended": "Adds a memorable first-day view without making the itinerary too strenuous.",
                    "photo_query": f"{destination_region} scenic viewpoint sunset",
                    "tips": ["Bring layers", "Keep this stop optional if travel is delayed"],
                    "constraints_satisfied": ["scenic", "photography", "not too strenuous"],
                },
            ]

        return [
            {
                "sequence": 1,
                "segment_type": SegmentType.MEAL,
                "start_time": "08:00",
                "end_time": "09:00",
                "origin": base_area,
                "destination": "Breakfast near lodging",
                "description": "Simple breakfast before the main outing.",
                "food_recommendation": "Coffee shop with portable breakfast options",
                "cost_estimate": "$10-$20",
                "tips": ["Start early for softer light and easier parking"],
                "constraints_satisfied": ["practical pacing"],
            },
            {
                "sequence": 2,
                "segment_type": SegmentType.ACTIVITY,
                "start_time": "09:30",
                "end_time": "12:00",
                "origin": base_area,
                "destination": f"Underrated {destination_region} trail area",
                "description": "Moderate scenic walk focused on quieter viewpoints and photo compositions.",
                "estimated_travel_time": "25 min drive",
                "estimated_distance": "10 miles",
                "why_recommended": "Balances scenery with lower driving and avoids only choosing the most obvious stops.",
                "photo_query": f"underrated trail {destination_region} landscape photography",
                "tips": ["Download offline maps", "Pack water and sun protection"],
                "constraints_satisfied": ["hidden gem", "photography", "low driving"],
            },
            {
                "sequence": 3,
                "segment_type": SegmentType.BUFFER,
                "start_time": "12:00",
                "end_time": "13:00",
                "origin": f"Underrated {destination_region} trail area",
                "destination": base_area,
                "description": "Flexible buffer for weather, parking, or extra photo time.",
                "estimated_travel_time": "25 min drive",
                "estimated_distance": "10 miles",
                "tips": ["Use this time to shorten or extend the morning activity"],
                "constraints_satisfied": ["flexible pacing"],
            },
            {
                "sequence": 4,
                "segment_type": SegmentType.VIEWPOINT,
                "start_time": "17:30",
                "end_time": "19:30",
                "origin": base_area,
                "destination": f"{destination_region} sunset viewpoint",
                "description": "Golden-hour viewpoint with low-effort access.",
                "estimated_travel_time": "20 min drive",
                "estimated_distance": "8 miles",
                "why_recommended": "Protects the best light window without packing the middle of the day.",
                "photo_query": f"{destination_region} golden hour viewpoint",
                "tips": ["Arrive before sunset", "Bring a tripod if conditions allow"],
                "constraints_satisfied": ["scenic", "photography"],
            },
        ]

    def _infer_destination_region(self, query: str) -> str:
        normalized_query = query.lower()
        if "amsterdam" in normalized_query:
            return "Amsterdam"
        if "teton" in normalized_query:
            return "Grand Teton National Park"
        if "rocky" in normalized_query or "mountain" in normalized_query:
            return "Rocky Mountains"
        return "Custom Destination"
