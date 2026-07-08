import { useState, useRef, useEffect, type FormEvent, type ElementType } from "react";
import {
  Plane, Car, Mountain, Utensils, BedDouble, Eye, Train, Clock,
  ArrowLeft, AlertCircle, MapPin, ChevronDown, Check, Calendar,
  Globe, Map as MapIcon, Building2, X, Star, ArrowRight,
} from "lucide-react";

import { fetchNextCards, streamTripFromDraft, generateCustomCard } from "../api";
import type { CardOption, CardStep, ChoiceMade } from "../api";
import GenerationStatus, { type GenerationStep } from "../components/GenerationStatus";
import TripMap from "../components/TripMap";
import TripCalendarView from "../components/TripCalendarView";
import type { TripDraftRequest, TripPlan, BudgetLevel } from "../types";

// ── Segment config ─────────────────────────────────────────────────────────────

type SegmentConfig = { gradient: string; icon: ElementType; iconClass?: string; label: string };

const SEGMENT: Record<string, SegmentConfig> = {
  arrival:   { gradient: "linear-gradient(145deg,#1e3a8a,#1d4ed8)", icon: Plane,    label: "Arrival" },
  drive:     { gradient: "linear-gradient(145deg,#78350f,#d97706)", icon: Car,      label: "Drive" },
  activity:  { gradient: "linear-gradient(145deg,#064e3b,#059669)", icon: Mountain, label: "Activity" },
  meal:      { gradient: "linear-gradient(145deg,#7c2d12,#ea580c)", icon: Utensils, label: "Meal" },
  lodging:   { gradient: "linear-gradient(145deg,#581c87,#9333ea)", icon: BedDouble,label: "Lodging" },
  viewpoint: { gradient: "linear-gradient(145deg,#0c4a6e,#0ea5e9)", icon: Eye,      label: "Viewpoint" },
  flight:    { gradient: "linear-gradient(145deg,#312e81,#6366f1)", icon: Plane,    label: "Flight" },
  transit:   { gradient: "linear-gradient(145deg,#1e293b,#64748b)", icon: Train,    label: "Transit" },
  buffer:    { gradient: "linear-gradient(145deg,#1c1917,#78716c)", icon: Clock,    label: "Free time" },
  departure: { gradient: "linear-gradient(145deg,#7f1d1d,#ef4444)", icon: Plane,    label: "Departure", iconClass: "rotate-45" },
};
const DEFAULT_SEG = SEGMENT.activity;

// ── Assembling phase steps ─────────────────────────────────────────────────────

const BASE_ASSEMBLING_STEPS: GenerationStep[] = [
  { label: "Compiling your journey",   status: "pending" },
  { label: "Finding travel context",   status: "pending" },
  { label: "Structuring itinerary",    status: "pending" },
  { label: "Building day-by-day plan", status: "pending" },
  { label: "Finalizing details",       status: "pending" },
];

function updateAssemblingSteps(steps: GenerationStep[], message: string): GenerationStep[] {
  const next = steps.map((s) => ({ ...s }));
  const m = message.toLowerCase();
  if (m.includes("normaliz") || m.includes("compil"))         { next[0].status = "active"; }
  else if (m.includes("finding") || m.includes("context"))    { next[0].status = "done"; next[1].status = "active"; }
  else if (m.includes("building") || m.includes("prompt"))    { next[0].status = "done"; next[1].status = "done"; next[2].status = "active"; }
  else if (m.includes("generating") || m.includes("concise")) { next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "active"; }
  else if (m.includes("validat") || m.includes("structure"))  { next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "done"; next[4].status = "active"; }
  return next;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "input" | "intent" | "building" | "assembling" | "complete";
type TripScale = "city" | "regional" | "international";

type TripParams = {
  destination: string;
  origin: string;
  start_date: string;
  end_date: string;
  num_travelers: number;
  budget_level: string;
  trip_scale: TripScale;
  vibes: string[];
};

type HistoryEntry = {
  step: CardStep;
  prevChoices: ChoiceMade[];
  prevDay: number;
  prevLocation: string;
};

type PendingMapPoint = { lat: number; lng: number; name: string };

// ── Root component ────────────────────────────────────────────────────────────

export default function TripBuilderPage() {
  const [phase, setPhase]   = useState<Phase>("input");
  const [params, setParams] = useState<TripParams | null>(null);

  // Input phase scroll-driven blur
  const heroBgRef = useRef<HTMLDivElement>(null);
  const scrimRef  = useRef<HTMLDivElement>(null);

  // Building state
  const [currentStep, setCurrentStep]       = useState<CardStep | null>(null);
  const [choicesMade, setChoicesMade]       = useState<ChoiceMade[]>([]);
  const [history, setHistory]               = useState<HistoryEntry[]>([]);
  const [currentDay, setCurrentDay]         = useState(1);
  const [currentLocation, setCurrentLocation] = useState("");
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [hoveredId, setHoveredId]           = useState<string | null>(null);
  const [isFetching, setIsFetching]         = useState(false);
  const [cardError, setCardError]           = useState<string | null>(null);

  // Custom card state
  const [customCard, setCustomCard]             = useState<CardOption | null>(null);
  const [customCardLoading, setCustomCardLoading] = useState(false);
  const [pendingMapPoint, setPendingMapPoint]   = useState<PendingMapPoint | null>(null);

  // Prefetch cache: card_id → promise of next CardStep
  const prefetchCache = useRef<Map<string, Promise<CardStep>>>(new Map());

  // Assembling state
  const [genSteps, setGenSteps]         = useState<GenerationStep[]>(BASE_ASSEMBLING_STEPS);
  const [assembleError, setAssembleError] = useState<string | null>(null);

  // Complete state
  const [trip, setTrip] = useState<TripPlan | null>(null);

  useEffect(() => {
    if (phase !== "input") return;
    const bg    = heroBgRef.current;
    const scrim = scrimRef.current;
    if (!bg || !scrim) return;
    const onScroll = () => {
      const p = Math.min(window.scrollY / (window.innerHeight * 0.75), 1);
      bg.style.filter     = `blur(${p * 18}px)`;
      scrim.style.opacity = String(0.18 + p * 0.52);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [phase]);

  // Pre-fetch next step for all options while user decides
  useEffect(() => {
    if (!currentStep || !params || currentStep.is_final_step) return;
    prefetchCache.current.clear();

    currentStep.options.forEach((opt) => {
      const choice: ChoiceMade = {
        step: currentStep.step_number,
        card_id: opt.id,
        title: opt.title,
        description: opt.description,
        segment_type: opt.segment_type,
        duration_hours: opt.duration_hours,
        next_location: opt.next_location,
        lat: opt.lat,
        lng: opt.lng,
      };
      const nextChoices  = [...choicesMade, choice];
      const nextDay      = currentDay + 1;
      const nextLocation = opt.next_location;

      prefetchCache.current.set(
        opt.id,
        fetchNextCards({
          destination:   params.destination,
          origin:        params.origin || null,
          start_date:    params.start_date,
          end_date:      params.end_date,
          num_travelers: params.num_travelers,
          budget_level:  params.budget_level,
          trip_scale:    params.trip_scale,
          vibes:         params.vibes,
          choices_made:  nextChoices,
          current_day:   nextDay,
          current_location: nextLocation,
        }),
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.step_number]);

  function buildPayload(p: TripParams, choices: ChoiceMade[], day: number, location: string) {
    return {
      destination:   p.destination,
      origin:        p.origin || null,
      start_date:    p.start_date,
      end_date:      p.end_date,
      num_travelers: p.num_travelers,
      budget_level:  p.budget_level,
      trip_scale:    p.trip_scale,
      vibes:         p.vibes,
      choices_made:  choices,
      current_day:   day,
      current_location: location,
    };
  }

  async function loadNextStep(
    p: TripParams,
    choices: ChoiceMade[],
    day: number,
    location: string,
    cachedPromise?: Promise<CardStep>,
  ) {
    setIsFetching(true);
    setCardError(null);
    setCurrentStep(null);
    setSelectedId(null);
    setHoveredId(null);
    setCustomCard(null);
    setPendingMapPoint(null);
    try {
      const step = await (cachedPromise ?? fetchNextCards(buildPayload(p, choices, day, location)));
      setCurrentStep(step);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Failed to load options. Please try again.");
    } finally {
      setIsFetching(false);
    }
  }

  async function startJourney(p: TripParams) {
    setParams(p);
    setChoicesMade([]);
    setHistory([]);
    setCurrentDay(1);
    setCurrentLocation(p.destination);
    setCardError(null);
    setCustomCard(null);
    setPendingMapPoint(null);
    prefetchCache.current.clear();
    setPhase("building");
    await loadNextStep(p, [], 1, p.destination);
  }

  function handleSelectCard(id: string) {
    if (isFetching) return;
    setSelectedId((prev) => (prev === id ? null : id));
  }

  async function handleConfirm() {
    if (!selectedId || !currentStep || !params) return;

    const chosen: CardOption = selectedId === "custom" && customCard
      ? customCard
      : currentStep.options.find((o) => o.id === selectedId)!;

    if (!chosen) return;

    const choice: ChoiceMade = {
      step:          currentStep.step_number,
      card_id:       chosen.id,
      title:         chosen.title,
      description:   chosen.description,
      segment_type:  chosen.segment_type,
      duration_hours: chosen.duration_hours,
      next_location: chosen.next_location,
      lat:           chosen.lat,
      lng:           chosen.lng,
    };

    setHistory((prev) => [
      ...prev,
      { step: currentStep, prevChoices: choicesMade, prevDay: currentDay, prevLocation: currentLocation },
    ]);

    const newChoices  = [...choicesMade, choice];
    const nextDay     = currentDay + 1;
    const nextLocation = chosen.next_location;

    setChoicesMade(newChoices);
    setCurrentDay(nextDay);
    setCurrentLocation(nextLocation);

    if (currentStep.is_final_step) {
      await assembleItinerary(params, newChoices);
    } else {
      const cached = selectedId !== "custom" ? prefetchCache.current.get(selectedId) : undefined;
      prefetchCache.current.clear();
      await loadNextStep(params, newChoices, nextDay, nextLocation, cached);
    }
  }

  function handleBack() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setChoicesMade(last.prevChoices);
    setCurrentDay(last.prevDay);
    setCurrentLocation(last.prevLocation);
    setCurrentStep(last.step);
    setSelectedId(null);
    setHoveredId(null);
    setCardError(null);
    setCustomCard(null);
    setPendingMapPoint(null);
    prefetchCache.current.clear();
  }

  async function handleCustomLocation(location: string, lat?: number, lng?: number) {
    if (!params || !location.trim()) return;
    setCustomCardLoading(true);
    setCustomCard(null);
    setPendingMapPoint(null);
    try {
      const card = await generateCustomCard({
        destination:    params.destination,
        custom_location: location.trim(),
        day_number:     currentDay,
        trip_days:      tripDays ?? 3,
        budget_level:   params.budget_level,
        vibes:          params.vibes,
        choices_made:   choicesMade,
        lat:            lat ?? null,
        lng:            lng ?? null,
      });
      setCustomCard(card);
    } catch (err) {
      console.error("Custom card error:", err);
    } finally {
      setCustomCardLoading(false);
    }
  }

  async function handleMapClick(lat: number, lng: number) {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { headers: { "User-Agent": "Lopan-TripPlanner/1.0" } },
      );
      const data = await resp.json() as Record<string, unknown>;
      const address = (data.address ?? {}) as Record<string, string>;
      const name =
        address.city || address.town || address.village || address.county ||
        (typeof data.display_name === "string"
          ? data.display_name.split(",")[0]
          : `${lat.toFixed(2)}, ${lng.toFixed(2)}`);
      setPendingMapPoint({ lat, lng, name });
    } catch {
      setPendingMapPoint({ lat, lng, name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` });
    }
  }

  async function assembleItinerary(p: TripParams, choices: ChoiceMade[]) {
    setPhase("assembling");
    setGenSteps(BASE_ASSEMBLING_STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    setAssembleError(null);

    const summary = choices
      .map((c) => `Day ${c.step}: ${c.title} (ending at ${c.next_location})`)
      .join("; ");
    const query = `${p.num_travelers}-person trip to ${p.destination}${p.origin ? ` from ${p.origin}` : ""}, ${p.budget_level} budget${p.vibes.length ? `, focused on ${p.vibes.join(" and ")}` : ""}. Day-by-day journey plan: ${summary}. Build a complete detailed itinerary honoring these day choices with realistic timings, meals, and logistics.`;

    const draft: TripDraftRequest = {
      query,
      start_date:       p.start_date || null,
      end_date:         p.end_date || null,
      origin_location:  p.origin || null,
      budget_level:     (p.budget_level as BudgetLevel) || null,
      num_travelers:    p.num_travelers,
      user_preferences: { travel_styles: p.vibes, interests: [], avoid: [] },
    };

    try {
      const result = await streamTripFromDraft(draft, (message) => {
        setGenSteps((prev) => updateAssemblingSteps(prev, message));
      });
      setTrip(result);
      setPhase("complete");
    } catch (err) {
      setAssembleError(err instanceof Error ? err.message : "Failed to assemble itinerary.");
      setPhase("building");
    }
  }

  const tripDays =
    params?.start_date && params?.end_date
      ? Math.max(1, Math.round((new Date(params.end_date).getTime() - new Date(params.start_date).getTime()) / 86400000) + 1)
      : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh">
      {phase === "input" && (
        <>
          <div ref={heroBgRef} className="fixed inset-0 -z-10 scale-110 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hero-bg.jpg')", willChange: "filter" }} />
          <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "radial-gradient(ellipse 110% 60% at 50% -5%, rgba(201,160,40,0.22) 0%, transparent 65%)" }} />
          <div ref={scrimRef} className="pointer-events-none fixed inset-0 -z-10 bg-forest-950" style={{ opacity: 0.18, willChange: "opacity" }} />
          <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(6,16,11,0.48) 0%, rgba(6,16,11,0.06) 58%, transparent 75%)" }} />
          <InputPhase onNext={(base) => setParams({ ...base, trip_scale: "regional", vibes: [] })} onAdvance={() => setPhase("intent")} />
        </>
      )}

      {phase === "intent" && params && (
        <IntentPhase
          params={params}
          onStart={(scale, vibes) => {
            const full = { ...params, trip_scale: scale, vibes };
            setParams(full);
            startJourney(full);
          }}
          onBack={() => setPhase("input")}
        />
      )}

      {phase === "building" && params && (
        <BuildingPhase
          step={currentStep}
          choicesMade={choicesMade}
          currentDay={currentDay}
          tripDays={tripDays}
          currentLocation={currentLocation}
          selectedId={selectedId}
          hoveredId={hoveredId}
          isFetching={isFetching}
          error={cardError}
          canGoBack={history.length > 0}
          customCard={customCard}
          customCardLoading={customCardLoading}
          pendingMapPoint={pendingMapPoint}
          onSelect={handleSelectCard}
          onHover={setHoveredId}
          onConfirm={handleConfirm}
          onBack={handleBack}
          onCustomSubmit={handleCustomLocation}
          onGeneratePending={() => pendingMapPoint && handleCustomLocation(pendingMapPoint.name, pendingMapPoint.lat, pendingMapPoint.lng)}
          onDismissPending={() => setPendingMapPoint(null)}
          onClearCustomCard={() => { setCustomCard(null); if (selectedId === "custom") setSelectedId(null); }}
          onMapClick={handleMapClick}
        />
      )}

      {phase === "assembling" && (
        <div className="min-h-dvh bg-cream-100 dark:bg-forest-900 pt-20">
          {assembleError ? (
            <div className="mx-auto max-w-lg px-6 py-12">
              <div className="flex items-start gap-3 rounded-2xl border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{assembleError}</p>
              </div>
            </div>
          ) : (
            <GenerationStatus steps={genSteps} />
          )}
        </div>
      )}

      {phase === "complete" && trip && (
        <div className="fixed inset-0 bg-cream-50 dark:bg-forest-950 text-forest-900 dark:text-cream-100 flex flex-col" style={{ paddingTop: "64px" }}>
          <TripCalendarView trip={trip} />
        </div>
      )}
    </div>
  );
}

// ── Input phase ───────────────────────────────────────────────────────────────

type BaseParams = Omit<TripParams, "trip_scale" | "vibes">;

function InputPhase({
  onNext,
  onAdvance,
}: {
  onNext: (p: BaseParams) => void;
  onAdvance: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const destination = String(fd.get("destination") ?? "").trim();
    if (!destination) return;
    onNext({
      destination,
      origin:       String(fd.get("origin") ?? "").trim(),
      start_date:   String(fd.get("start_date") ?? ""),
      end_date:     String(fd.get("end_date") ?? ""),
      num_travelers: Math.max(1, Number(fd.get("num_travelers") ?? 2)),
      budget_level:  String(fd.get("budget_level") ?? "medium"),
    });
    onAdvance();
  }

  return (
    <div>
      <section className="relative flex min-h-dvh flex-col items-center justify-center">
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center animate-fade-in">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
            Choose Your Own Adventure
          </p>
          <h1 className="mb-6 font-serif text-6xl font-bold leading-[1.05] tracking-tight text-cream-50 md:text-7xl" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.85), 0 6px 32px rgba(0,0,0,0.5)" }}>
            Build your trip<br />
            <em className="not-italic text-gold-300" style={{ textShadow: "0 0 28px rgba(237,207,114,0.85), 0 0 80px rgba(201,160,40,0.45), 0 2px 10px rgba(0,0,0,0.95)" }}>
              one day at a time.
            </em>
          </h1>
          <p className="mb-10 mx-auto max-w-lg text-base leading-relaxed text-cream-200" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.85)" }}>
            Pick what each day looks like — see your route appear on the map — then get a full AI-crafted itinerary.
          </p>
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-forest-950 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/30 transition-all cursor-pointer"
            style={{ filter: "drop-shadow(0 4px 16px rgba(201,160,40,0.35))" }}
          >
            Start your journey →
          </button>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-cream-400 animate-fade-in" style={{ animationDelay: "700ms" }}>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      <div ref={formRef} className="py-14">
        <div className="mx-auto max-w-lg px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-400">Where to?</p>
            <h2 className="font-serif text-2xl font-semibold text-cream-100">Tell us the basics</h2>
          </div>
          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-forest-950/80 backdrop-blur-md shadow-2xl p-6 space-y-4">
            <InputField label="Destination *" name="destination" placeholder="e.g. Kyoto, Japan" required />
            <InputField label="Departing from" name="origin" placeholder="e.g. San Francisco, CA" />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Start date" name="start_date" type="date" />
              <InputField label="End date" name="end_date" type="date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Travelers" name="num_travelers" type="number" defaultValue="2" min="1" max="20" />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-forest-400 mb-1.5">Budget</label>
                <select name="budget_level" defaultValue="medium" className="w-full rounded-xl border border-forest-700 bg-forest-900/50 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all cursor-pointer">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full rounded-xl bg-gold-500 px-5 py-3.5 text-sm font-semibold text-forest-950 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/20 transition-all cursor-pointer mt-2">
              Next: choose your vibe →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, type = "text", placeholder, defaultValue, min, max, required }: {
  label: string; name: string; type?: string; placeholder?: string;
  defaultValue?: string; min?: string; max?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-forest-400 mb-1.5">{label}</label>
      <input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} min={min} max={max} required={required}
        className="w-full rounded-xl border border-forest-700 bg-forest-900/50 px-4 py-2.5 text-sm text-cream-100 placeholder:text-forest-500 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all" />
    </div>
  );
}

// ── Intent phase ──────────────────────────────────────────────────────────────

const SCALE_OPTIONS: { value: TripScale; label: string; subtitle: string; icon: ElementType }[] = [
  { value: "city",          label: "City deep-dive",     subtitle: "One city, neighborhoods & vibes", icon: Building2 },
  { value: "regional",      label: "Regional adventure", subtitle: "Move between towns or parks",     icon: MapIcon },
  { value: "international", label: "Country / world",    subtitle: "Cross major distances each day",  icon: Globe },
];

const VIBE_OPTIONS = ["Nature", "Culture", "Food & Drink", "Nightlife", "Adventure", "Relaxation", "Photography", "History"];

function IntentPhase({
  params,
  onStart,
  onBack,
}: {
  params: TripParams;
  onStart: (scale: TripScale, vibes: string[]) => void;
  onBack: () => void;
}) {
  const [scale, setScale]   = useState<TripScale>("regional");
  const [vibes, setVibes]   = useState<string[]>([]);

  function toggleVibe(v: string) {
    setVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  return (
    <div className="min-h-dvh bg-forest-950 flex flex-col items-center justify-center px-6 pt-24 pb-12">
      <button type="button" onClick={onBack} className="absolute top-24 left-6 flex items-center gap-1.5 text-sm text-forest-400 hover:text-cream-200 transition-colors cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="w-full max-w-2xl animate-fade-in">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Almost there</p>
          <h2 className="font-serif text-3xl font-semibold text-cream-100">What kind of trip is this?</h2>
          <p className="mt-2 text-sm text-forest-400">{params.destination}</p>
        </div>

        {/* Scale cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {SCALE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = scale === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScale(opt.value)}
                className={[
                  "flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 text-center transition-all duration-200 cursor-pointer",
                  active
                    ? "border-gold-400 bg-gold-500/10 shadow-lg shadow-gold-500/10"
                    : "border-forest-700 bg-forest-900/40 hover:border-forest-500",
                ].join(" ")}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-gold-500/20" : "bg-forest-800"}`}>
                  <Icon className={`h-5 w-5 ${active ? "text-gold-400" : "text-forest-400"}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-cream-100" : "text-forest-300"}`}>{opt.label}</p>
                  <p className="mt-0.5 text-xs text-forest-500">{opt.subtitle}</p>
                </div>
                {active && <Check className="h-4 w-4 text-gold-400" />}
              </button>
            );
          })}
        </div>

        {/* Vibe chips */}
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold text-forest-400">What matters most? <span className="font-normal">(pick any)</span></p>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((v) => {
              const active = vibes.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleVibe(v)}
                  className={[
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all cursor-pointer",
                    active
                      ? "border-gold-500 bg-gold-500/15 text-gold-300"
                      : "border-forest-700 text-forest-400 hover:border-forest-500 hover:text-forest-200",
                  ].join(" ")}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStart(scale, vibes)}
          className="w-full rounded-xl bg-gold-500 px-5 py-4 text-sm font-semibold text-forest-950 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/20 transition-all cursor-pointer"
        >
          Start planning →
        </button>
      </div>
    </div>
  );
}

// ── Building phase ─────────────────────────────────────────────────────────────

type BuildingPhaseProps = {
  step: CardStep | null;
  choicesMade: ChoiceMade[];
  currentDay: number;
  tripDays: number | null;
  currentLocation: string;
  selectedId: string | null;
  hoveredId: string | null;
  isFetching: boolean;
  error: string | null;
  canGoBack: boolean;
  customCard: CardOption | null;
  customCardLoading: boolean;
  pendingMapPoint: PendingMapPoint | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onConfirm: () => void;
  onBack: () => void;
  onCustomSubmit: (location: string) => void;
  onGeneratePending: () => void;
  onDismissPending: () => void;
  onClearCustomCard: () => void;
  onMapClick: (lat: number, lng: number) => void;
};

function BuildingPhase({
  step, choicesMade, currentDay, tripDays, currentLocation,
  selectedId, hoveredId, isFetching, error, canGoBack,
  customCard, customCardLoading, pendingMapPoint,
  onSelect, onHover, onConfirm, onBack,
  onCustomSubmit, onGeneratePending, onDismissPending, onClearCustomCard, onMapClick,
}: BuildingPhaseProps) {
  const total = tripDays ?? (step ? step.step_number + step.estimated_remaining_steps : choicesMade.length + 4);

  return (
    <div className="fixed inset-0 bg-forest-950 text-cream-100 flex flex-col" style={{ paddingTop: "64px" }}>
      {/* Top bar */}
      <div className="flex-none border-b border-forest-800/60 px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm">
            {canGoBack && !isFetching && (
              <button type="button" onClick={onBack} className="flex items-center gap-1 text-forest-500 hover:text-cream-300 transition-colors cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
            <span className="flex items-center gap-1.5 text-forest-400">
              <Calendar className="h-3.5 w-3.5" />
              Day {currentDay}{tripDays ? ` of ${tripDays}` : ""}
            </span>
            <span className="text-forest-700">·</span>
            <span className="flex items-center gap-1.5 text-forest-400 max-w-[200px] truncate">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{currentLocation || "—"}</span>
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
              <div
                key={i}
                className={[
                  "rounded-full transition-all duration-300",
                  i < choicesMade.length
                    ? "h-2 w-5 bg-gold-500"
                    : i === choicesMade.length
                    ? "h-2 w-5 bg-gold-400/50 animate-pulse"
                    : "h-2 w-2 bg-forest-800",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Body — two columns */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[420px_1fr]">
        {/* Left: cards */}
        <div className="flex flex-col overflow-y-auto p-5 gap-4 md:border-r md:border-forest-800/60">
          {error && !isFetching && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-800/40 bg-red-900/15 p-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {isFetching && (
            <div className="animate-fade-in space-y-3">
              <div className="h-4 w-2/3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="h-5 w-4/5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}

          {step && !isFetching && (
            <>
              <div>
                <p className="text-xs text-forest-500 mb-1">{step.context}</p>
                <h2 className="font-serif text-xl font-semibold text-cream-100 leading-snug">{step.prompt}</h2>
              </div>

              <div className="flex flex-col gap-3">
                {step.options.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    isSelected={selectedId === option.id}
                    isHovered={hoveredId === option.id}
                    onClick={() => onSelect(option.id)}
                    onMouseEnter={() => onHover(option.id)}
                    onMouseLeave={() => onHover(null)}
                  />
                ))}
              </div>

              {/* Custom destination section */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-forest-800/60" />
                  <span className="text-xs text-forest-600 flex-none">or go somewhere specific</span>
                  <div className="flex-1 h-px bg-forest-800/60" />
                </div>

                {/* Pending map point */}
                {pendingMapPoint && (
                  <div className="flex items-center gap-3 rounded-2xl border border-gold-500/30 bg-gold-500/8 px-4 py-3">
                    <MapPin className="h-4 w-4 text-gold-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cream-200 truncate">{pendingMapPoint.name}</p>
                      <p className="text-xs text-forest-500">Plan a day here?</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onGeneratePending}
                        disabled={customCardLoading}
                        className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        Generate →
                      </button>
                      <button
                        type="button"
                        onClick={onDismissPending}
                        className="text-forest-600 hover:text-forest-300 transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom card loading skeleton */}
                {customCardLoading && (
                  <div className="flex items-center gap-4 rounded-2xl border border-gold-500/20 bg-gold-500/5 p-4 animate-pulse">
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl" style={{ background: "rgba(212,160,23,0.1)" }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 rounded" style={{ background: "rgba(212,160,23,0.15)" }} />
                      <div className="h-4 w-3/4 rounded" style={{ background: "rgba(212,160,23,0.1)" }} />
                      <div className="h-3 w-1/2 rounded" style={{ background: "rgba(212,160,23,0.07)" }} />
                    </div>
                  </div>
                )}

                {/* Generated custom card */}
                {customCard && !customCardLoading && (
                  <CustomOptionCard
                    option={customCard}
                    isSelected={selectedId === "custom"}
                    onSelect={() => onSelect("custom")}
                    onClear={onClearCustomCard}
                  />
                )}

                {/* Text input — shown when no custom card and no pending point */}
                {!pendingMapPoint && !customCardLoading && !customCard && (
                  <>
                    <CustomLocationInput onSubmit={onCustomSubmit} />
                    <p className="text-center text-xs text-forest-700">or click anywhere on the map to pin a spot</p>
                  </>
                )}
              </div>

              {/* Confirm button */}
              {selectedId && (
                <button
                  type="button"
                  onClick={onConfirm}
                  className="mt-1 w-full rounded-xl bg-gold-500 py-3.5 text-sm font-semibold text-forest-950 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/20 transition-all cursor-pointer animate-slide-up"
                >
                  {step.is_final_step
                    ? "Build my itinerary →"
                    : selectedId === "custom" && customCard
                    ? `Lock in ${customCard.next_location} →`
                    : `Lock in Day ${currentDay} →`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Right: map */}
        <div className="hidden md:block relative">
          <TripMap
            choices={choicesMade}
            currentOptions={[
              ...(step?.options ?? []),
              ...(customCard ? [customCard] : []),
            ]}
            hoveredOptionId={hoveredId}
            selectedOptionId={selectedId}
            onMapClick={onMapClick}
            pendingPoint={pendingMapPoint}
          />
        </div>
      </div>
    </div>
  );
}

// ── Option card (compact horizontal) ─────────────────────────────────────────

function OptionCard({
  option, isSelected, isHovered, onClick, onMouseEnter, onMouseLeave,
}: {
  option: CardOption;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const config = SEGMENT[option.segment_type] ?? DEFAULT_SEG;
  const Icon = config.icon;
  const highlighted = isSelected || isHovered;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        "flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer ring-2",
        isSelected
          ? "ring-gold-400 shadow-lg shadow-gold-500/15 scale-[1.01]"
          : highlighted
          ? "ring-forest-600"
          : "ring-transparent hover:ring-forest-700",
      ].join(" ")}
      style={{ background: highlighted ? config.gradient : "rgba(255,255,255,0.04)" }}
    >
      {/* Icon square */}
      <div className="flex-none flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(0,0,0,0.25)" }}>
        <Icon className={`h-6 w-6 text-cream-200 ${config.iconClass ?? ""}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-forest-400 font-medium uppercase tracking-wide">{config.label}</span>
          <span className="text-forest-700 text-xs">·</span>
          <span className="text-xs text-forest-400 tabular-nums">{option.duration_hours}h</span>
        </div>
        <p className="font-serif font-semibold text-cream-100 leading-snug line-clamp-2">{option.title}</p>
        <p className="text-xs text-forest-400 mt-1 line-clamp-2 leading-relaxed">{option.description}</p>
      </div>

      {/* Option letter or check */}
      <div className={[
        "flex-none flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
        isSelected ? "bg-gold-500 text-forest-900" : "bg-forest-800 text-forest-400",
      ].join(" ")}>
        {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : option.id.toUpperCase()}
      </div>
    </button>
  );
}

// ── Custom option card ────────────────────────────────────────────────────────

function CustomOptionCard({
  option, isSelected, onSelect, onClear,
}: {
  option: CardOption;
  isSelected: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  const config = SEGMENT[option.segment_type] ?? DEFAULT_SEG;
  const Icon = config.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={[
          "w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer ring-2",
          isSelected
            ? "ring-gold-400 shadow-lg shadow-gold-500/20 scale-[1.01]"
            : "ring-gold-500/40 hover:ring-gold-500/70",
        ].join(" ")}
        style={{ background: isSelected ? config.gradient : "rgba(212,160,23,0.06)" }}
      >
        <div className="flex-none flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(0,0,0,0.25)" }}>
          <Icon className={`h-6 w-6 text-cream-200 ${config.iconClass ?? ""}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gold-400 uppercase tracking-wide">Your Pick</span>
            <span className="text-forest-700 text-xs">·</span>
            <span className="text-xs text-forest-400 tabular-nums">{option.duration_hours}h</span>
          </div>
          <p className="font-serif font-semibold text-cream-100 leading-snug line-clamp-2">{option.title}</p>
          <p className="text-xs text-forest-400 mt-1 line-clamp-2 leading-relaxed">{option.description}</p>
        </div>

        <div className={[
          "flex-none flex h-7 w-7 items-center justify-center rounded-full transition-all",
          isSelected ? "bg-gold-500 text-forest-900" : "bg-gold-500/15 text-gold-400",
        ].join(" ")}>
          {isSelected
            ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            : <Star className="h-3.5 w-3.5" fill="currentColor" />}
        </div>
      </button>

      {/* Dismiss button */}
      {!isSelected && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-forest-700 bg-forest-800 text-forest-500 transition-all hover:bg-forest-700 hover:text-cream-200 cursor-pointer z-10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Custom location text input ────────────────────────────────────────────────

function CustomLocationInput({ onSubmit }: { onSubmit: (location: string) => void }) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Have somewhere in mind? e.g. Astoria, OR"
        className="flex-1 rounded-xl border border-forest-700/60 bg-forest-900/30 px-4 py-2.5 text-sm text-cream-100 placeholder:text-forest-600 outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20 transition-all"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-400 transition-all hover:bg-gold-500/20 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
