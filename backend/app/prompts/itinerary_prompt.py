from app.schemas.trip import GenerateTripRequest, TripPlan


def build_itinerary_prompt(request: GenerateTripRequest, context: dict) -> str:
    schema_json = TripPlan.model_json_schema()
    return f"""
You are an expert travel-planning agent.

Generate a logistics-aware, structured itinerary that strictly matches the provided JSON schema.
Do not return markdown. Return JSON only.

User request:
{request.model_dump_json(indent=2)}

Retrieved travel context:
{context}

Schema:
{schema_json}

Important planning rules:
- Each day must contain 3-4 sequential segments, not a simple day summary.
- Keep segment descriptions concise, ideally under 25 words.
- Include at most 2 tips per segment.
- Include realistic buffers and avoid overloading the day.
- Respect user constraints such as budget, low driving, photography, food, accessibility, and avoid lists.
- Estimate the total trip cost range for the requested number of travelers, excluding flights unless flight segments are included.
- Prefer specific named recommendations over generic placeholders.
- For activities, viewpoints, trails, museums, neighborhoods, and scenic stops, use real place names when reasonably confident.
- For meals, include 1 specific restaurant/cafe option when reasonably confident; otherwise name a specific neighborhood or food hall area.
- For lodging, recommend a specific lodging area, neighborhood, or base town rather than a generic "hotel" phrase.
- Avoid phrases like "local restaurant", "nearby cafe", "scenic viewpoint", or "hidden trail" unless paired with a specific named example.
- If a named recommendation may require verification, add a brief tip to confirm hours, reservations, permits, or seasonal access.
- Use placeholders for image URLs unless a real image source is available.
""".strip()


def build_refinement_prompt(existing_plan: TripPlan, user_feedback: str) -> str:
    schema_json = TripPlan.model_json_schema()
    return f"""
You are revising an existing structured travel itinerary.

Return a complete revised itinerary as JSON only. It must strictly match the provided schema.

User feedback:
{user_feedback}

Existing itinerary:
{existing_plan.model_dump_json(indent=2)}

Schema:
{schema_json}
""".strip()
