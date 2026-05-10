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
- Each day must contain multiple sequential segments, not a simple day summary.
- Include realistic buffers and avoid overloading the day.
- Respect user constraints such as budget, low driving, photography, food, accessibility, and avoid lists.
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

