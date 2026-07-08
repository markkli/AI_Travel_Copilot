from datetime import date, timedelta

try:
    from openai import OpenAI as _OpenAIClient
except ImportError:
    _OpenAIClient = None  # type: ignore[assignment,misc]

from app.core.config import Settings, get_settings
from app.schemas.card import (
    CardOption, CardStep, CardStepLLM, CardOptionLLM, NextCardsRequest,
    AlternativeSegment, AlternativeSegmentsRequest, AlternativeSegmentsResponse,
    CustomCardRequest,
)
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
        if self.settings.llm_mode == "openai":
            return self._normalize_with_openai(draft)

        return self._normalize_with_rules(draft)

    def _normalize_with_openai(self, draft: TripDraftRequest) -> GenerateTripRequest:
        if not self.settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY must be set when LLM_MODE=openai")

        OpenAI = _OpenAIClient

        client = OpenAI(api_key=self.settings.openai_api_key)
        completion = client.beta.chat.completions.parse(
            model=self.settings.openai_normalization_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a travel request normalization agent. Convert vague travel input "
                        "into a complete GenerateTripRequest JSON object. Use the current date "
                        f"{date.today().isoformat()} to infer relative dates. If dates are missing, "
                        "default to a trip starting about 30 days from today and lasting exactly 4 days inclusive. "
                        "If budget is missing, use medium. If traveler count is missing, use 2. "
                        "Preserve explicit user-provided fields."
                    ),
                },
                {"role": "user", "content": draft.model_dump_json()},
            ],
            response_format=GenerateTripRequest,
        )

        parsed_request = completion.choices[0].message.parsed
        if parsed_request is None:
            raise ValueError("OpenAI response did not contain a parsed GenerateTripRequest")

        return GenerateTripRequest.model_validate(parsed_request.model_dump())

    def _normalize_with_rules(self, draft: TripDraftRequest) -> GenerateTripRequest:
        start_date = draft.start_date or (date.today() + timedelta(days=30))
        end_date = draft.end_date or (start_date + timedelta(days=3))

        return GenerateTripRequest(
            query=draft.query,
            start_date=start_date,
            end_date=end_date,
            origin_location=draft.origin_location,
            budget_level=draft.budget_level or BudgetLevel.MEDIUM,
            num_travelers=draft.num_travelers,
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
        if self.settings.llm_mode == "openai":
            return self._generate_with_openai(prompt)

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

        OpenAI = _OpenAIClient

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
        num_travelers = request.num_travelers
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
                "num_travelers": num_travelers,
                "estimated_total_cost_range": self._mock_cost_range(
                    trip_length=trip_length,
                    budget=budget,
                    num_travelers=num_travelers,
                ),
                "summary": "A mock structured itinerary generated from local schemas and placeholder context.",
                "days": days,
            }
        )

    def _mock_cost_range(self, trip_length: int, budget: BudgetLevel, num_travelers: int) -> str:
        daily_cost_by_budget = {
            BudgetLevel.LOW: (90, 150),
            BudgetLevel.MEDIUM: (180, 300),
            BudgetLevel.HIGH: (350, 600),
            BudgetLevel.LUXURY: (700, 1200),
        }
        daily_min, daily_max = daily_cost_by_budget[budget]
        min_total = daily_min * trip_length * num_travelers
        max_total = daily_max * trip_length * num_travelers
        return f"${min_total:,}-${max_total:,} for {num_travelers} traveler(s), excluding flights"

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

    # ── Card-flow methods ─────────────────────────────────────────────────────

    def generate_next_cards(self, request: NextCardsRequest) -> CardStep:
        if self.settings.llm_mode == "openai":
            llm_result = self._generate_cards_with_openai(request)
        else:
            llm_result = self._mock_card_step(request)

        options_with_ids = [
            CardOption(**opt.model_dump(), id=chr(ord("a") + i))
            for i, opt in enumerate(llm_result.options)
        ]
        return CardStep(
            step_number=len(request.choices_made) + 1,
            context=llm_result.context,
            prompt=llm_result.prompt,
            options=options_with_ids,
            is_final_step=llm_result.is_final_step,
            estimated_remaining_steps=llm_result.estimated_remaining_steps,
        )

    def _generate_cards_with_openai(self, request: NextCardsRequest) -> CardStepLLM:
        if not self.settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY must be set when LLM_MODE=openai")

        OpenAI = _OpenAIClient

        trip_days = (request.end_date - request.start_date).days + 1
        target_steps = trip_days  # one decision per day
        steps_done = len(request.choices_made)
        steps_left = max(0, target_steps - steps_done - 1)
        is_final = steps_left <= 0

        scale_hint = {
            "city": "Each option should be a different neighborhood, area, or activity cluster within the city.",
            "regional": "Each option should be a different town, park, or regional destination reachable in a day.",
            "international": "Each option should be a different city or major region to spend the day in.",
        }.get(request.trip_scale, "Each option should represent a meaningfully different place or experience.")

        vibes_hint = f"Traveler vibes: {', '.join(request.vibes)}." if request.vibes else ""

        choices_summary = ""
        if request.choices_made:
            choices_summary = "Days already planned:\n" + "\n".join(
                f"  Day {c.step}: {c.title} → {c.next_location}"
                for c in request.choices_made
            )

        system_prompt = (
            "You are running an interactive day-by-day trip planner. "
            "Each option represents a FULL DAY's experience — not a single activity. "
            "Generate exactly 3 meaningfully different options for the traveler's next day. "
            "Each option must use real place names specific to the destination. "
            "Make each option reflect a distinct day-experience: adventure vs. culture vs. relaxation, "
            "or different locations/regions the traveler could head to. "
            f"{scale_hint} "
            "For lat/lng: provide accurate approximate coordinates for each option's primary location. "
            "Use segment_type: activity, drive, viewpoint for day-trips; lodging for rest days."
        )
        user_prompt = (
            f"Trip to: {request.destination}"
            + (f" (from {request.origin})" if request.origin else "")
            + f"\nDates: {request.start_date} to {request.end_date} ({trip_days} days total)"
            + f"\nTravelers: {request.num_travelers}, Budget: {request.budget_level}"
            + (f"\n{vibes_hint}" if vibes_hint else "")
            + f"\nCurrently at: {request.current_location or request.destination}"
            + f"\n{choices_summary}"
            + f"\nPlanning day {steps_done + 1} of {trip_days}."
            + ("\nThis is the LAST day — set is_final_step=true." if is_final else
               f" {steps_left} day(s) remain after this.")
        )

        client = OpenAI(api_key=self.settings.openai_api_key)
        completion = client.beta.chat.completions.parse(
            model=self.settings.openai_normalization_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=CardStepLLM,
        )
        result = completion.choices[0].message.parsed
        if result is None:
            raise ValueError("Card generation returned no result")
        return result

    def _mock_card_step(self, request: NextCardsRequest) -> CardStepLLM:
        trip_days = (request.end_date - request.start_date).days + 1
        steps_done = len(request.choices_made)
        target_steps = trip_days
        is_final = steps_done >= target_steps - 1
        dest = request.destination
        loc = request.current_location or dest
        day_num = steps_done + 1

        return CardStepLLM(
            context=f"Day {day_num} of {trip_days}. You're based in {loc}.",
            prompt=f"How do you want to spend Day {day_num}?",
            options=[
                CardOptionLLM(
                    title=f"Explore {dest} highlights",
                    description=f"Hit the iconic sights, walkable neighborhoods, and hidden gems of {dest}.",
                    segment_type=SegmentType.ACTIVITY,
                    duration_hours=10.0,
                    next_location=loc,
                    lat=0.0,
                    lng=0.0,
                    tags=["sightseeing", "walkable"],
                ),
                CardOptionLLM(
                    title=f"Nature day outside {dest}",
                    description="Escape the city for a nearby park, trail, or scenic viewpoint.",
                    segment_type=SegmentType.VIEWPOINT,
                    duration_hours=9.0,
                    next_location=loc,
                    lat=0.0,
                    lng=0.0,
                    tags=["nature", "outdoors"],
                ),
                CardOptionLLM(
                    title="Food, culture, and slow morning",
                    description="Markets, museums, local lunch spots — a relaxed immersive day.",
                    segment_type=SegmentType.ACTIVITY,
                    duration_hours=8.0,
                    next_location=loc,
                    lat=0.0,
                    lng=0.0,
                    tags=["food", "culture"],
                ),
            ],
            is_final_step=is_final,
            estimated_remaining_steps=max(0, target_steps - steps_done - 1),
        )

    # ── Alternative segments ──────────────────────────────────────────────────

    def suggest_alternative_segments(self, request: AlternativeSegmentsRequest) -> AlternativeSegmentsResponse:
        if self.settings.llm_mode == "openai":
            return self._alternatives_with_openai(request)
        return self._mock_alternatives(request)

    def _alternatives_with_openai(self, request: AlternativeSegmentsRequest) -> AlternativeSegmentsResponse:
        if not self.settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY must be set when LLM_MODE=openai")

        OpenAI = _OpenAIClient

        client = OpenAI(api_key=self.settings.openai_api_key)
        system_prompt = (
            "You are a travel planning assistant. "
            "Suggest exactly 3 alternative activities for the given time slot. "
            "Each alternative must be meaningfully different from the current segment. "
            "Use real place names specific to the destination. "
            "Keep the same time range. Vary the type of experience across options."
        )
        user_prompt = (
            f"Destination: {request.destination}"
            + f"\nDay {request.day_number}"
            + (f" ({request.day_date})" if request.day_date else "")
            + f"\nCurrent: {request.current_title} ({request.segment_type})"
            + f"\nTime slot: {request.start_time} to {request.end_time}"
            + f"\nBudget: {request.budget_level}"
            + f"\nDescription: {request.current_description}"
            + "\n\nSuggest 3 different alternatives for this exact time slot."
        )
        completion = client.beta.chat.completions.parse(
            model=self.settings.openai_normalization_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=AlternativeSegmentsResponse,
        )
        result = completion.choices[0].message.parsed
        if result is None:
            raise ValueError("Alternatives generation returned no result")
        return result

    def _mock_alternatives(self, request: AlternativeSegmentsRequest) -> AlternativeSegmentsResponse:
        dest = request.destination
        t0, t1 = request.start_time, request.end_time
        return AlternativeSegmentsResponse(
            alternatives=[
                AlternativeSegment(
                    title=f"Local market & street food in {dest}",
                    description="Browse artisan stalls and sample street food at a neighborhood market.",
                    segment_type=SegmentType.ACTIVITY,
                    start_time=t0,
                    end_time=t1,
                    cost_estimate="$20–50",
                ),
                AlternativeSegment(
                    title=f"Scenic overlook hike near {dest}",
                    description="A moderate trail to a panoramic viewpoint with sweeping landscape views.",
                    segment_type=SegmentType.VIEWPOINT,
                    start_time=t0,
                    end_time=t1,
                    cost_estimate="Free",
                ),
                AlternativeSegment(
                    title=f"Cultural museum visit in {dest}",
                    description="Explore local history, art, or science at a top-rated museum.",
                    segment_type=SegmentType.ACTIVITY,
                    start_time=t0,
                    end_time=t1,
                    cost_estimate="$15–30",
                ),
            ]
        )

    # ── Custom card ───────────────────────────────────────────────────────────

    def generate_custom_card(self, request: CustomCardRequest) -> CardOption:
        if self.settings.llm_mode == "openai":
            return self._custom_card_with_openai(request)
        return self._mock_custom_card(request)

    def _custom_card_with_openai(self, request: CustomCardRequest) -> CardOption:
        if not self.settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY must be set when LLM_MODE=openai")

        OpenAI = _OpenAIClient

        choices_summary = ""
        if request.choices_made:
            choices_summary = "\nDays already planned:\n" + "\n".join(
                f"  Day {c.step}: {c.title} → {c.next_location}" for c in request.choices_made
            )

        system_prompt = (
            "You are a travel planning assistant. "
            "Generate a single full-day experience card for a specific location chosen by the traveler. "
            "The card must describe a compelling day at that exact location using real place names. "
            "Provide accurate coordinates for that location."
        )
        user_prompt = (
            f"Trip destination: {request.destination}"
            + f"\nDay {request.day_number} of {request.trip_days}"
            + f"\nTraveler's chosen location: {request.custom_location}"
            + f"\nBudget: {request.budget_level}"
            + (f"\nVibes: {', '.join(request.vibes)}" if request.vibes else "")
            + choices_summary
            + f"\n\nGenerate a compelling full-day experience at {request.custom_location}."
        )

        client = OpenAI(api_key=self.settings.openai_api_key)
        completion = client.beta.chat.completions.parse(
            model=self.settings.openai_normalization_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=CardOptionLLM,
        )
        result = completion.choices[0].message.parsed
        if result is None:
            raise ValueError("Custom card generation returned no result")

        lat = request.lat if request.lat is not None else result.lat
        lng = request.lng if request.lng is not None else result.lng
        return CardOption(**{**result.model_dump(), "id": "custom", "lat": lat, "lng": lng})

    def _mock_custom_card(self, request: CustomCardRequest) -> CardOption:
        return CardOption(
            id="custom",
            title=f"Your day in {request.custom_location}",
            description=f"A day exploring {request.custom_location} on your own terms — local finds, hidden gems, and your own pace.",
            segment_type=SegmentType.ACTIVITY,
            duration_hours=9.0,
            next_location=request.custom_location,
            lat=request.lat or 0.0,
            lng=request.lng or 0.0,
            tags=["custom", "your pick"],
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _infer_destination_region(self, query: str) -> str:
        normalized_query = query.lower()
        if "amsterdam" in normalized_query:
            return "Amsterdam"
        if "teton" in normalized_query:
            return "Grand Teton National Park"
        if "rocky" in normalized_query or "mountain" in normalized_query:
            return "Rocky Mountains"
        return "Custom Destination"
