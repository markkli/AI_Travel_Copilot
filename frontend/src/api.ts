import type { GenerateTripRequest, RecommendationCard, TripDraftRequest, TripPlan } from "./types";

// ── Card-flow types ───────────────────────────────────────────────────────────

export type CardOption = {
  id: string;
  title: string;
  description: string;
  segment_type: string;
  duration_hours: number;
  next_location: string;
  lat: number;
  lng: number;
  tags: string[];
};

export type CardStep = {
  step_number: number;
  context: string;
  prompt: string;
  options: CardOption[];
  is_final_step: boolean;
  estimated_remaining_steps: number;
};

export type ChoiceMade = {
  step: number;
  card_id: string;
  title: string;
  description: string;
  segment_type: string;
  duration_hours: number;
  next_location: string;
  lat: number;
  lng: number;
};

export type NextCardsPayload = {
  destination: string;
  origin?: string | null;
  start_date: string;
  end_date: string;
  num_travelers: number;
  budget_level: string;
  trip_scale: string;
  vibes: string[];
  choices_made: ChoiceMade[];
  current_day: number;
  current_location: string;
};

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

export function generateTripFromDraft(payload: TripDraftRequest): Promise<TripPlan> {
  return requestJson<TripPlan>("/trip/generate-from-draft", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function streamTripFromDraft(
  payload: TripDraftRequest,
  onStatus: (message: string) => void,
): Promise<TripPlan> {
  const response = await fetch(`${API_BASE_URL}/trip/generate-from-draft-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tripPlan: TripPlan | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const parsedEvent = parseServerSentEvent(rawEvent);
      if (!parsedEvent) {
        continue;
      }

      if (parsedEvent.event === "status") {
        const status = JSON.parse(parsedEvent.data) as { message?: string };
        if (status.message) {
          onStatus(status.message);
        }
      }

      if (parsedEvent.event === "result") {
        tripPlan = JSON.parse(parsedEvent.data) as TripPlan;
      }
    }
  }

  if (!tripPlan) {
    throw new Error("Trip generation stream ended without a result.");
  }

  return tripPlan;
}

function parseServerSentEvent(rawEvent: string): { event: string; data: string } | null {
  const eventLine = rawEvent.split("\n").find((line) => line.startsWith("event: "));
  const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));

  if (!eventLine || !dataLine) {
    return null;
  }

  return {
    event: eventLine.slice("event: ".length),
    data: dataLine.slice("data: ".length),
  };
}

export function fetchNextCards(payload: NextCardsPayload): Promise<CardStep> {
  return requestJson<CardStep>("/trip/next-cards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AlternativeSeg = {
  title: string;
  description: string;
  segment_type: string;
  start_time: string;
  end_time: string;
  cost_estimate?: string | null;
};

export type SuggestAlternativesPayload = {
  destination: string;
  day_number: number;
  day_date?: string | null;
  segment_type: string;
  current_title: string;
  current_description: string;
  start_time: string;
  end_time: string;
  budget_level?: string;
};

export function suggestAlternatives(
  payload: SuggestAlternativesPayload,
): Promise<{ alternatives: AlternativeSeg[] }> {
  return requestJson<{ alternatives: AlternativeSeg[] }>("/trip/suggest-alternatives", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CustomCardPayload = {
  destination: string;
  custom_location: string;
  day_number: number;
  trip_days: number;
  budget_level?: string;
  vibes?: string[];
  choices_made?: ChoiceMade[];
  lat?: number | null;
  lng?: number | null;
};

export function generateCustomCard(payload: CustomCardPayload): Promise<CardOption> {
  return requestJson<CardOption>("/trip/custom-card", {
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
