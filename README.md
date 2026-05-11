# AI Travel Copilot

Backend-first MVP for a structured AI travel-planning app.

The first milestone focuses on:

- FastAPI backend
- Detailed nested Pydantic itinerary schemas
- Mock travel context retrieval
- Mock LLM generation/refinement with schema validation
- Lightweight recommendation cards

Frontend comes after the backend contracts are stable.

## Backend Quickstart

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

If file watching is restricted in your environment, run without reload:

```bash
uvicorn app.main:app
```

Open:

- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

## MVP Endpoints

- `POST /trip/generate`
- `POST /trip/refine`
- `GET /recommendations`

## Example API Calls

Start the backend first:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app
```

### Generate a Trip

```bash
curl -X POST http://127.0.0.1:8000/trip/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I want a 3-day scenic trip in the Rocky Mountains with no long drives, good for astrophotography and hidden trails.",
    "start_date": "2026-07-10",
    "end_date": "2026-07-12",
    "origin_location": "Denver, CO",
    "budget_level": "medium",
    "user_preferences": {
      "travel_styles": ["scenic", "photography", "low-driving"],
      "interests": ["astrophotography", "hidden trails"],
      "avoid": ["long drives"]
    }
  }'
```

### Get Recommendation Cards

```bash
curl http://127.0.0.1:8000/recommendations
```

### Refine a Trip

`/trip/refine` expects an existing `TripPlan` plus feedback. The easiest way to try it manually is through:

```text
http://127.0.0.1:8000/docs
```

Generate a trip first, copy the response JSON into `existing_itinerary`, then add feedback such as:

```text
Make this less driving-heavy and add more underrated trails.
```

## Run Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

## Frontend Quickstart

The frontend is a Vite + React + Tailwind app in `frontend/`.

You need Node.js and npm installed first.

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5173
```

The frontend expects the backend to be running at:

```text
http://127.0.0.1:8000
```

To point the frontend at a different backend URL, create `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```
