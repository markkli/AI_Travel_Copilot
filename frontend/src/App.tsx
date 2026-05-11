import { useEffect, useState } from "react";

import { fetchRecommendations, generateTrip, refineTrip } from "./api";
import ItineraryTimeline from "./components/ItineraryTimeline";
import RecommendationCards from "./components/RecommendationCards";
import RefinementBox from "./components/RefinementBox";
import SearchPanel from "./components/SearchPanel";
import type { GenerateTripRequest, RecommendationCard, TripPlan } from "./types";

export default function App() {
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationCard | null>(null);
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations()
      .then(setRecommendations)
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function handleGenerate(payload: GenerateTripRequest) {
    setIsGenerating(true);
    setError(null);
    try {
      const generatedTrip = await generateTrip(payload);
      setTrip(generatedTrip);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Trip generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRefine(feedback: string) {
    if (!trip) {
      return;
    }

    setIsRefining(true);
    setError(null);
    try {
      const refinedTrip = await refineTrip(trip, feedback);
      setTrip(refinedTrip);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Trip refinement failed.");
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f8]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">AI Travel Copilot</p>
            <h1 className="mt-1 text-3xl font-bold text-stone-950">Plan structured trips, not search results.</h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-stone-600">
            Generate logistics-aware itineraries with day timelines, sequential stops, practical buffers, and
            refinement through feedback.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[420px_1fr]">
        <aside className="space-y-4">
          <SearchPanel
            isLoading={isGenerating}
            selectedRecommendation={selectedRecommendation}
            onSubmit={handleGenerate}
          />
          <RefinementBox trip={trip} isLoading={isRefining} onRefine={handleRefine} />
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </aside>

        <div className="space-y-6">
          <RecommendationCards cards={recommendations} onSelect={setSelectedRecommendation} />
          <ItineraryTimeline trip={trip} />
        </div>
      </div>
    </main>
  );
}

