import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { fetchRecommendations, refineTrip, streamTripFromDraft } from "../api";
import GenerationStatus, { type GenerationStep } from "../components/GenerationStatus";
import ItineraryTimeline from "../components/ItineraryTimeline";
import RecommendationCards from "../components/RecommendationCards";
import RefinementBox from "../components/RefinementBox";
import SearchPanel from "../components/SearchPanel";
import type { RecommendationCard, TripDraftRequest, TripPlan } from "../types";

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
  if (m.includes("normaliz"))                              { next[0].status = "active"; }
  else if (m.includes("finding") || m.includes("context")) { next[0].status = "done"; next[1].status = "active"; }
  else if (m.includes("building") || m.includes("prompt")) { next[0].status = "done"; next[1].status = "done"; next[2].status = "active"; }
  else if (m.includes("generating") || m.includes("concise")) { next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "active"; }
  else if (m.includes("validat") || m.includes("structure")) { next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "done"; next[4].status = "active"; }
  return next;
}

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationCard | null>(null);
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);
  const planRef    = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const heroBgRef  = useRef<HTMLDivElement>(null);  // the photo
  const scrimRef   = useRef<HTMLDivElement>(null);  // dark overlay

  // Scroll-driven effect: blur image + darken scrim together — no re-renders
  useEffect(() => {
    const bg    = heroBgRef.current;
    const scrim = scrimRef.current;
    if (!bg || !scrim) return;

    const onScroll = () => {
      const progress = Math.min(window.scrollY / (window.innerHeight * 0.75), 1);
      bg.style.filter    = `blur(${progress * 18}px)`;
      scrim.style.opacity = String(0.18 + progress * 0.52); // 0.18 → 0.70
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetchRecommendations()
      .then(setRecommendations)
      .catch(() => { /* optional inspiration — fail silently */ });
  }, []);

  // Pre-select recommendation from /explore link
  useEffect(() => {
    const id = searchParams.get("recommendation");
    if (id && recommendations.length > 0) {
      const match = recommendations.find((r) => r.id === id);
      if (match) {
        setSelectedRecommendation(match);
        setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
      }
    }
  }, [searchParams, recommendations]);

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
      setTrip(await refineTrip(trip, feedback));
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
    <div className="transition-colors">
      {/*
        ── Three fixed layers — unified backdrop for hero + form ──────────
        All three are position:fixed so they never scroll away.
        DOM order = stacking order: image at bottom, scrim on top.
      */}

      {/* 1. Photo — blurs as you scroll */}
      <div
        ref={heroBgRef}
        className="fixed inset-0 -z-10 scale-110 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.jpg')", willChange: "filter" }}
      />

      {/* 2. Gold ambient radial — static warmth over the photo */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 110% 60% at 50% -5%, rgba(201,160,40,0.22) 0%, transparent 65%)" }}
      />

      {/* 3. Dark scrim — starts at 18% opacity, darkens to 70% as you scroll */}
      <div
        ref={scrimRef}
        className="pointer-events-none fixed inset-0 -z-10 bg-forest-950"
        style={{ opacity: 0.18, willChange: "opacity" }}
      />

      {/*
        4. Vignette — fixed so it has no element boundary to clip against (no hairline seam).
           Darkens the center of the viewport where the hero text lives; fades to nothing
           before the form section, so the card below is unaffected.
      */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(6,16,11,0.48) 0%, rgba(6,16,11,0.06) 58%, transparent 75%)" }}
      />

      {/* ── Hero — fully transparent, image/scrim show through ── */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center">

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center animate-fade-in">
          <p
            className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
          >
            AI-Powered Travel Planning
          </p>
          <h1
            className="mb-6 font-serif text-6xl font-bold leading-[1.05] tracking-tight text-cream-50 md:text-7xl lg:text-8xl"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.85), 0 6px 32px rgba(0,0,0,0.5)" }}
          >
            Plan your next<br />
            {/* Bright gold with triple-layer text-shadow glow — solid color pops on dark */}
            <em
              className="not-italic text-gold-300"
              style={{ textShadow: "0 0 28px rgba(237,207,114,0.85), 0 0 80px rgba(201,160,40,0.45), 0 2px 10px rgba(0,0,0,0.95)" }}
            >
              adventure.
            </em>
          </h1>
          <p
            className="mb-10 mx-auto max-w-lg text-base leading-relaxed text-cream-200 md:text-lg"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.85), 0 3px 18px rgba(0,0,0,0.5)" }}
          >
            Describe your ideal trip and get a logistics-aware, day-by-day itinerary — with real stops, drive times, meals, and practical buffers.
          </p>
          <button
            type="button"
            onClick={() => planRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-forest-950 transition-all duration-200 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/30 cursor-pointer"
            style={{ filter: "drop-shadow(0 4px 16px rgba(201,160,40,0.35))" }}
          >
            Start planning →
          </button>
        </div>

        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-cream-400 animate-fade-in"
          style={{ animationDelay: "700ms", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.8))" }}
        >
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      {/* ── Form section — transparent, card floats over blurred+dark photo ── */}
      <div ref={planRef} className="py-14">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
              Where to next?
            </p>
            <h2 className="font-serif text-2xl font-semibold text-cream-100">
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
          <div className="flex items-start gap-3 rounded-2xl border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* ── Results — solid bg takes over once a trip is generated ── */}
      <div ref={resultsRef} className="bg-cream-100 dark:bg-forest-900 text-forest-900 dark:text-cream-100">
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
