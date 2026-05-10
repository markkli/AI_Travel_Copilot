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
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open:

- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

## MVP Endpoints

- `POST /trip/generate`
- `POST /trip/refine`
- `GET /recommendations`

