from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.trip import router as trip_router


app = FastAPI(
    title="AI Travel Copilot API",
    version="0.1.0",
    description="Backend MVP for structured AI-assisted travel itinerary generation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trip_router)
app.include_router(recommendations_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

