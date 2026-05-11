import type { GenerateTripRequest, RecommendationCard, TripPlan } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchRecommendations(): Promise<RecommendationCard[]> {
  return requestJson<RecommendationCard[]>("/recommendations");
}

export function generateTrip(payload: GenerateTripRequest): Promise<TripPlan> {
  return requestJson<TripPlan>("/trip/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refineTrip(existingItinerary: TripPlan, userFeedback: string): Promise<TripPlan> {
  return requestJson<TripPlan>("/trip/refine", {
    method: "POST",
    body: JSON.stringify({
      existing_itinerary: existingItinerary,
      user_feedback: userFeedback,
    }),
  });
}

