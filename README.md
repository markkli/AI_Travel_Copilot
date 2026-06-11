# AI Travel Copilot

Backend-first MVP for a structured AI travel-planning app.

The current MVP focuses on:

- FastAPI backend
- Detailed nested Pydantic itinerary schemas
- Markdown-backed RAG retrieval with Chroma
- Mock or OpenAI generation with schema validation
- Lightweight recommendation cards
- React frontend with itinerary generation and refinement controls

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

## RAG Knowledge Index

Destination knowledge lives in:

```text
backend/app/data/destination_docs/
```

After adding or editing a destination document, rebuild the vector index:

```bash
cd backend
source .venv/bin/activate
python -m app.cli.index_destination_docs
```

The default configuration uses deterministic local embeddings and stores
Chroma data under `backend/data/chroma`, so indexing is free and works offline.
To use OpenAI embeddings, copy `backend/.env.example` to `backend/.env`, then
set:

```text
EMBEDDING_MODE=openai
OPENAI_API_KEY=your-key
```

Rebuild the index whenever the embedding model or destination documents change.

### Optional Docker Chroma

The embedded Chroma database is enough for local development. To run the vector
database as a separate service instead:

```bash
docker compose up -d chroma
```

Then set these values in `backend/.env`:

```text
CHROMA_MODE=http
CHROMA_HOST=localhost
CHROMA_PORT=8100
```

Run the indexing command again after switching modes. Docker must be installed
before using this option.

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
