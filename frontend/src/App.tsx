import { useEffect, useRef, useState } from "react";
import { MapPin, AlertCircle, ChevronDown } from "lucide-react";

import { fetchRecommendations, refineTrip, streamTripFromDraft } from "./api";
import GenerationStatus, { type GenerationStep } from "./components/GenerationStatus";
import ItineraryTimeline from "./components/ItineraryTimeline";
import RecommendationCards from "./components/RecommendationCards";
import RefinementBox from "./components/RefinementBox";
import SearchPanel from "./components/SearchPanel";
import type { RecommendationCard, TripDraftRequest, TripPlan } from "./types";

const INITIAL_STEPS: GenerationStep[] = [
  { label: "Understanding your request", status: "pending" },
  { label: "Finding travel context",     status: "pending" },
  { label: "Structuring itinerary",      status: "pending" },
  { label: "Generating day-by-day plan", status: "pending" },
  { label: "Finalizing details",         status: "pending" },
];

function updateStepsFromMessage(steps: GenerationStep[], message: string): GenerationStep[] {
  const next = steps.map((s) => ({ ...s }));
  const m = message.toLowerCase();

  if (m.includes("normaliz")) {
    next[0].status = "active";
  } else if (m.includes("finding") || m.includes("context")) {
    next[0].status = "done"; next[1].status = "active";
  } else if (m.includes("building") || m.includes("prompt")) {
    next[0].status = "done"; next[1].status = "done"; next[2].status = "active";
  } else if (m.includes("generating") || m.includes("concise")) {
    next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "active";
  } else if (m.includes("validat") || m.includes("structure")) {
    next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "done"; next[4].status = "active";
  }

  return next;
}

export default function App() {
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationCard | null>(null);
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecommendations()
      .then(setRecommendations)
      .catch(() => {
        // Recommendations are optional inspiration — fail silently
      });
  }, []);

  async function handleGenerate(payload: TripDraftRequest) {
    setIsGenerating(true);
    setTrip(null);
    setError(null);
    setSteps(INITIAL_STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);

    try {
      const result = await streamTripFromDraft(payload, (message) => {
        setSteps((prev) => updateStepsFromMessage(prev, message));
      });
      setTrip(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trip generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRefine(feedback: string) {
    if (!trip) return;
    setIsRefining(true);
    setError(null);
    try {
      const refined = await refineTrip(trip, feedback);
      setTrip(refined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trip refinement failed.");
    } finally {
      setIsRefining(false);
    }
  }

  function handleSelectRecommendation(card: RecommendationCard) {
    setSelectedRecommendation(card);
    planRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const showRecommendations = !isGenerating && !trip;

  return (
    <div className="min-h-dvh bg-cream-100 dark:bg-forest-900 font-sans text-forest-900 dark:text-cream-100 transition-colors">
      {/* ── Header — always dark so it reads over the hero ───── */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-forest-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/15 ring-1 ring-gold-500/30">
              <MapPin className="h-4 w-4 text-gold-400" strokeWidth={2} />
            </div>
            <span className="font-serif text-lg font-semibold text-cream-100">
              AI Travel Copilot
            </span>
          </div>
          <span className="rounded-full border border-gold-500/40 px-2.5 py-0.5 text-xs font-medium uppercase tracking-widest text-gold-500">
            Beta
          </span>
        </div>
      </header>

      {/* ── Hero — full-screen, always dark ──────────────────── */}
      {/*
        To add a background image, place your photo at frontend/public/hero-bg.jpg
        and uncomment the div below. The gradient overlay will blend it in.
      */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-forest-950">
        {/* Uncomment + set src when you have an image:
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        */}

        {/* Layered ambient gradients */}
        <div className="pointer-events-none absolute inset-0">
          {/* Warm gold bloom at top center */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_-5%,rgba(201,168,76,0.22),transparent_65%)]" />
          {/* Dark vignette at bottom corners to anchor the text */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_110%,rgba(6,16,11,0.9),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_110%,rgba(6,16,11,0.9),transparent_60%)]" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center animate-fade-in">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">
            AI-Powered Travel Planning
          </p>
          <h1 className="mb-6 font-serif text-6xl font-bold leading-[1.05] tracking-tight text-cream-50 md:text-7xl lg:text-8xl">
            Plan your next<br />
            <em className="not-italic text-gold-400">adventure.</em>
          </h1>
          <p className="mb-10 mx-auto max-w-lg text-base leading-relaxed text-cream-300 md:text-lg">
            Describe your ideal trip and get a logistics-aware, day-by-day itinerary — with real stops, drive times, meals, and practical buffers.
          </p>
          <button
            type="button"
            onClick={() => planRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-forest-950 transition-all duration-200 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/30 cursor-pointer"
          >
            Start planning →
          </button>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-cream-600 animate-fade-in"
          style={{ animationDelay: "700ms" }}
        >
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      {/* ── Plan (form) section ──────────────────────────────── */}
      <div ref={planRef} className="bg-cream-100 dark:bg-forest-900 border-b border-cream-200 dark:border-forest-800 py-14">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500">
              Where to next?
            </p>
            <h2 className="font-serif text-2xl font-semibold text-forest-900 dark:text-cream-100">
              Tell us about your trip
            </h2>
          </div>
          <SearchPanel
            isLoading={isGenerating}
            selectedRecommendation={selectedRecommendation}
            onSubmit={handleGenerate}
          />
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────── */}
      {error && (
        <div className="mx-auto mt-6 max-w-4xl px-6 animate-slide-up">
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* ── Results area ─────────────────────────────────────── */}
      <div ref={resultsRef}>
        {showRecommendations && (
          <RecommendationCards cards={recommendations} onSelect={handleSelectRecommendation} />
        )}

        {isGenerating && <GenerationStatus steps={steps} />}

        {trip && (
          <>
            <ItineraryTimeline trip={trip} />
            <RefinementBox trip={trip} isLoading={isRefining} onRefine={handleRefine} />
          </>
        )}
      </div>
    </div>
  );
}
