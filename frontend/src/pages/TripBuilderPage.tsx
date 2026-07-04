import { useState, useRef, useEffect, type FormEvent, type ElementType } from "react";
import {
  Plane, Car, Mountain, Utensils, BedDouble, Eye, Train, Clock,
  ArrowLeft, AlertCircle, MapPin, ChevronDown, Check, Calendar,
} from "lucide-react";

import { fetchNextCards, streamTripFromDraft } from "../api";
import type { CardOption, CardStep, ChoiceMade } from "../api";
import GenerationStatus, { type GenerationStep } from "../components/GenerationStatus";
import ItineraryTimeline from "../components/ItineraryTimeline";
import type { TripDraftRequest, TripPlan, BudgetLevel } from "../types";

// ── Segment config ─────────────────────────────────────────────────────────────

type SegmentConfig = {
  gradient: string;
  icon: ElementType;
  iconClass?: string;
  label: string;
  accent: string;
};

const SEGMENT: Record<string, SegmentConfig> = {
  arrival:   { gradient: "linear-gradient(145deg,#1e3a8a,#1d4ed8)", icon: Plane,    label: "Arrival",   accent: "border-blue-500/40 bg-blue-500/15 text-blue-300" },
  drive:     { gradient: "linear-gradient(145deg,#78350f,#d97706)", icon: Car,      label: "Drive",     accent: "border-amber-500/40 bg-amber-500/15 text-amber-300" },
  activity:  { gradient: "linear-gradient(145deg,#064e3b,#059669)", icon: Mountain, label: "Activity",  accent: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" },
  meal:      { gradient: "linear-gradient(145deg,#7c2d12,#ea580c)", icon: Utensils, label: "Meal",      accent: "border-orange-500/40 bg-orange-500/15 text-orange-300" },
  lodging:   { gradient: "linear-gradient(145deg,#581c87,#9333ea)", icon: BedDouble,label: "Lodging",   accent: "border-purple-500/40 bg-purple-500/15 text-purple-300" },
  viewpoint: { gradient: "linear-gradient(145deg,#0c4a6e,#0ea5e9)", icon: Eye,      label: "Viewpoint", accent: "border-sky-500/40 bg-sky-500/15 text-sky-300" },
  flight:    { gradient: "linear-gradient(145deg,#312e81,#6366f1)", icon: Plane,    label: "Flight",    accent: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300" },
  transit:   { gradient: "linear-gradient(145deg,#1e293b,#64748b)", icon: Train,    label: "Transit",   accent: "border-slate-500/40 bg-slate-500/15 text-slate-300" },
  buffer:    { gradient: "linear-gradient(145deg,#1c1917,#78716c)", icon: Clock,    label: "Free time", accent: "border-stone-500/40 bg-stone-500/15 text-stone-300" },
  departure: { gradient: "linear-gradient(145deg,#7f1d1d,#ef4444)", icon: Plane,    label: "Departure", accent: "border-red-500/40 bg-red-500/15 text-red-300", iconClass: "rotate-45" },
};
const DEFAULT_SEG = SEGMENT.activity;

// ── Utilities ─────────────────────────────────────────────────────────────────

function advanceTime(time: string, day: number, durationHours: number) {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + Math.round(durationHours * 60);
  const extraDays = Math.floor(totalMinutes / 1440);
  const rem = totalMinutes % 1440;
  return {
    time: `${String(Math.floor(rem / 60)).padStart(2, "0")}:${String(rem % 60).padStart(2, "0")}`,
    day: day + extraDays,
  };
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Assembling phase steps ─────────────────────────────────────────────────────

const BASE_ASSEMBLING_STEPS: GenerationStep[] = [
  { label: "Compiling your choices",   status: "pending" },
  { label: "Finding travel context",   status: "pending" },
  { label: "Structuring itinerary",    status: "pending" },
  { label: "Building day-by-day plan", status: "pending" },
  { label: "Finalizing details",       status: "pending" },
];

function updateAssemblingSteps(steps: GenerationStep[], message: string): GenerationStep[] {
  const next = steps.map((s) => ({ ...s }));
  const m = message.toLowerCase();
  if (m.includes("normaliz") || m.includes("compil"))        { next[0].status = "active"; }
  else if (m.includes("finding") || m.includes("context"))   { next[0].status = "done"; next[1].status = "active"; }
  else if (m.includes("building") || m.includes("prompt"))   { next[0].status = "done"; next[1].status = "done"; next[2].status = "active"; }
  else if (m.includes("generating") || m.includes("concise")){ next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "active"; }
  else if (m.includes("validat") || m.includes("structure")) { next[0].status = "done"; next[1].status = "done"; next[2].status = "done"; next[3].status = "done"; next[4].status = "active"; }
  return next;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "input" | "building" | "assembling" | "complete";

type TripParams = {
  destination: string;
  origin: string;
  start_date: string;
  end_date: string;
  num_travelers: number;
  budget_level: string;
};

type HistoryEntry = {
  step: CardStep;
  prevChoices: ChoiceMade[];
  prevDay: number;
  prevTime: string;
  prevLocation: string;
};

// ── Root component ────────────────────────────────────────────────────────────

export default function TripBuilderPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [params, setParams] = useState<TripParams | null>(null);

  // Building state
  const [currentStep, setCurrentStep] = useState<CardStep | null>(null);
  const [choicesMade, setChoicesMade] = useState<ChoiceMade[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentTime, setCurrentTime] = useState("09:00");
  const [currentLocation, setCurrentLocation] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Assembling state
  const [genSteps, setGenSteps] = useState<GenerationStep[]>(BASE_ASSEMBLING_STEPS);
  const [assembleError, setAssembleError] = useState<string | null>(null);

  // Complete state
  const [trip, setTrip] = useState<TripPlan | null>(null);

  // Input phase scroll-driven blur
  const heroBgRef = useRef<HTMLDivElement>(null);
  const scrimRef  = useRef<HTMLDivElement>(null);

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

  async function startJourney(p: TripParams) {
    setParams(p);
    setChoicesMade([]);
    setHistory([]);
    setCurrentDay(1);
    setCurrentTime("09:00");
    setCurrentLocation(p.destination);
    setSelectedId(null);
    setCardError(null);
    setPhase("building");
    await loadNextStep(p, [], 1, "09:00", p.destination);
  }

  async function loadNextStep(
    p: TripParams,
    choices: ChoiceMade[],
    day: number,
    time: string,
    location: string,
  ) {
    setIsFetching(true);
    setCardError(null);
    setCurrentStep(null);
    setSelectedId(null);
    try {
      const step = await fetchNextCards({
        destination: p.destination,
        origin: p.origin || null,
        start_date: p.start_date,
        end_date: p.end_date,
        num_travelers: p.num_travelers,
        budget_level: p.budget_level,
        choices_made: choices,
        current_day: day,
        current_time: time,
        current_location: location,
      });
      setCurrentStep(step);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Failed to load options. Please try again.");
    } finally {
      setIsFetching(false);
    }
  }

  function handleSelectCard(id: string) {
    if (isFetching) return;
    setSelectedId((prev) => (prev === id ? null : id));
  }

  async function handleConfirm() {
    if (!selectedId || !currentStep || !params) return;
    const chosen = currentStep.options.find((o) => o.id === selectedId)!;

    const choice: ChoiceMade = {
      step: currentStep.step_number,
      card_id: chosen.id,
      title: chosen.title,
      description: chosen.description,
      segment_type: chosen.segment_type,
      duration_hours: chosen.duration_hours,
      next_location: chosen.next_location,
    };

    setHistory((prev) => [
      ...prev,
      { step: currentStep, prevChoices: choicesMade, prevDay: currentDay, prevTime: currentTime, prevLocation: currentLocation },
    ]);

    const newChoices = [...choicesMade, choice];
    const { day, time } = advanceTime(currentTime, currentDay, chosen.duration_hours);

    setChoicesMade(newChoices);
    setCurrentDay(day);
    setCurrentTime(time);
    setCurrentLocation(chosen.next_location);

    if (currentStep.is_final_step) {
      await assembleItinerary(params, newChoices);
    } else {
      await loadNextStep(params, newChoices, day, time, chosen.next_location);
    }
  }

  function handleBack() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setChoicesMade(last.prevChoices);
    setCurrentDay(last.prevDay);
    setCurrentTime(last.prevTime);
    setCurrentLocation(last.prevLocation);
    setCurrentStep(last.step);
    setSelectedId(null);
    setCardError(null);
  }

  async function assembleItinerary(p: TripParams, choices: ChoiceMade[]) {
    setPhase("assembling");
    setGenSteps(BASE_ASSEMBLING_STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    setAssembleError(null);

    const summary = choices
      .map((c) => `${c.title} (${c.segment_type}, ${c.duration_hours}h → ${c.next_location}): ${c.description}`)
      .join("; then ");

    const query = `${p.num_travelers}-person trip to ${p.destination}${p.origin ? ` from ${p.origin}` : ""}, ${p.budget_level} budget. The traveler chose this sequence of experiences: ${summary}. Build a complete, detailed day-by-day itinerary that honors these choices with realistic timings and additional logistics.`;

    const draft: TripDraftRequest = {
      query,
      start_date: p.start_date || null,
      end_date: p.end_date || null,
      origin_location: p.origin || null,
      budget_level: (p.budget_level as BudgetLevel) || null,
      num_travelers: p.num_travelers,
      user_preferences: { travel_styles: [], interests: [], avoid: [] },
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh">
      {phase === "input" && (
        <>
          <div
            ref={heroBgRef}
            className="fixed inset-0 -z-10 scale-110 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-bg.jpg')", willChange: "filter" }}
          />
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{ background: "radial-gradient(ellipse 110% 60% at 50% -5%, rgba(201,160,40,0.22) 0%, transparent 65%)" }}
          />
          <div
            ref={scrimRef}
            className="pointer-events-none fixed inset-0 -z-10 bg-forest-950"
            style={{ opacity: 0.18, willChange: "opacity" }}
          />
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(6,16,11,0.48) 0%, rgba(6,16,11,0.06) 58%, transparent 75%)" }}
          />
          <InputPhase onStart={startJourney} />
        </>
      )}

      {phase === "building" && params && (
        <BuildingPhase
          step={currentStep}
          choicesMade={choicesMade}
          currentDay={currentDay}
          currentTime={currentTime}
          currentLocation={currentLocation}
          selectedId={selectedId}
          isFetching={isFetching}
          error={cardError}
          canGoBack={history.length > 0}
          onSelect={handleSelectCard}
          onConfirm={handleConfirm}
          onBack={handleBack}
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
        <div className="bg-cream-100 dark:bg-forest-900 pt-20">
          <ItineraryTimeline trip={trip} />
        </div>
      )}
    </div>
  );
}

// ── Input phase ───────────────────────────────────────────────────────────────

function InputPhase({ onStart }: { onStart: (params: TripParams) => void }) {
  const formRef = useRef<HTMLDivElement>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const destination = String(fd.get("destination") ?? "").trim();
    if (!destination) return;
    onStart({
      destination,
      origin: String(fd.get("origin") ?? "").trim(),
      start_date: String(fd.get("start_date") ?? ""),
      end_date: String(fd.get("end_date") ?? ""),
      num_travelers: Math.max(1, Number(fd.get("num_travelers") ?? 2)),
      budget_level: String(fd.get("budget_level") ?? "medium"),
    });
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center">
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center animate-fade-in">
          <p
            className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
          >
            Choose Your Own Adventure
          </p>
          <h1
            className="mb-6 font-serif text-6xl font-bold leading-[1.05] tracking-tight text-cream-50 md:text-7xl lg:text-8xl"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.85), 0 6px 32px rgba(0,0,0,0.5)" }}
          >
            Build your trip<br />
            <em
              className="not-italic text-gold-300"
              style={{ textShadow: "0 0 28px rgba(237,207,114,0.85), 0 0 80px rgba(201,160,40,0.45), 0 2px 10px rgba(0,0,0,0.95)" }}
            >
              one choice at a time.
            </em>
          </h1>
          <p
            className="mb-10 mx-auto max-w-lg text-base leading-relaxed text-cream-200 md:text-lg"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.85), 0 3px 18px rgba(0,0,0,0.5)" }}
          >
            Pick from AI-generated options at each step — meals, activities, drives — and watch your personalized itinerary take shape.
          </p>
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-forest-950 transition-all duration-200 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/30 cursor-pointer"
            style={{ filter: "drop-shadow(0 4px 16px rgba(201,160,40,0.35))" }}
          >
            Start your journey →
          </button>
        </div>
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-cream-400 animate-fade-in"
          style={{ animationDelay: "700ms", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.8))" }}
        >
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      {/* Form */}
      <div ref={formRef} className="py-14">
        <div className="mx-auto max-w-lg px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-400">Where to?</p>
            <h2 className="font-serif text-2xl font-semibold text-cream-100">Start your adventure</h2>
          </div>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-forest-950/80 backdrop-blur-md shadow-2xl p-6 space-y-4"
          >
            <InputField label="Destination *" name="destination" placeholder="e.g. Tokyo, Japan" required />
            <InputField label="Departing from" name="origin" placeholder="e.g. New York, NY" />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Start date" name="start_date" type="date" />
              <InputField label="End date" name="end_date" type="date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Travelers" name="num_travelers" type="number" defaultValue="2" min="1" max="20" />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-forest-400 mb-1.5">Budget</label>
                <select
                  name="budget_level"
                  defaultValue="medium"
                  className="w-full rounded-xl border border-forest-700 bg-forest-900/50 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gold-500 px-5 py-3.5 text-sm font-semibold text-forest-950 transition-all duration-200 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/20 cursor-pointer mt-2"
            >
              Begin journey →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label, name, type = "text", placeholder, defaultValue, min, max, required,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  defaultValue?: string; min?: string; max?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-forest-400 mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        max={max}
        required={required}
        className="w-full rounded-xl border border-forest-700 bg-forest-900/50 px-4 py-2.5 text-sm text-cream-100 placeholder:text-forest-500 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all"
      />
    </div>
  );
}

// ── Building phase ────────────────────────────────────────────────────────────

type BuildingPhaseProps = {
  step: CardStep | null;
  choicesMade: ChoiceMade[];
  currentDay: number;
  currentTime: string;
  currentLocation: string;
  selectedId: string | null;
  isFetching: boolean;
  error: string | null;
  canGoBack: boolean;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
};

function BuildingPhase({
  step, choicesMade, currentDay, currentTime, currentLocation,
  selectedId, isFetching, error, canGoBack,
  onSelect, onConfirm, onBack,
}: BuildingPhaseProps) {
  const totalDots = Math.min(
    step ? step.step_number + step.estimated_remaining_steps : choicesMade.length + 6,
    12,
  );
  const completedCount = choicesMade.length;

  return (
    <div className="min-h-dvh bg-forest-950 text-cream-100 flex flex-col">
      {/* Context bar */}
      <div className="pt-20 border-b border-forest-800/80">
        <div className="mx-auto max-w-4xl px-6 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-forest-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>Day {currentDay}</span>
              </span>
              <span className="text-forest-700">·</span>
              <span className="font-medium text-cream-200">{formatTime(currentTime)}</span>
              <span className="text-forest-700">·</span>
              <span className="flex items-center gap-1.5 text-forest-400 max-w-[180px] truncate">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{currentLocation || "—"}</span>
              </span>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalDots }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    "rounded-full transition-all duration-300",
                    i < completedCount
                      ? "h-2 w-5 bg-gold-500"
                      : i === completedCount
                      ? "h-2 w-5 bg-gold-500/40 animate-pulse"
                      : "h-2 w-2 bg-forest-800",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 mx-auto w-full max-w-4xl px-6 py-8">
        {canGoBack && !isFetching && (
          <button
            type="button"
            onClick={onBack}
            className="mb-6 flex items-center gap-1.5 text-sm text-forest-400 hover:text-cream-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {error && !isFetching && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isFetching && (
          <div className="animate-fade-in space-y-6">
            <div className="space-y-2">
              <div className="shimmer h-4 w-2/3 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="shimmer h-8 w-4/5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step content */}
        {step && !isFetching && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <p className="mb-3 text-sm leading-relaxed text-forest-400">{step.context}</p>
              <h2 className="font-serif text-2xl font-semibold text-cream-100 md:text-3xl">{step.prompt}</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-stretch">
              {step.options.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  isSelected={selectedId === option.id}
                  onClick={() => onSelect(option.id)}
                />
              ))}
            </div>

            {selectedId && (
              <div className="mt-8 flex justify-center animate-slide-up">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-full bg-gold-500 px-10 py-3.5 text-sm font-semibold text-forest-950 transition-all duration-200 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/30 cursor-pointer"
                >
                  {step.is_final_step ? "Build my itinerary →" : "Continue →"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Option card ───────────────────────────────────────────────────────────────

function OptionCard({
  option, isSelected, onClick,
}: {
  option: CardOption;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = SEGMENT[option.segment_type] ?? DEFAULT_SEG;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex flex-col text-left rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ring-2",
        isSelected
          ? "ring-gold-400 shadow-xl shadow-gold-500/20 scale-[1.02]"
          : "ring-transparent hover:ring-forest-600 hover:scale-[1.01]",
      ].join(" ")}
      style={{ background: config.gradient }}
    >
      {/* Decorative large icon */}
      <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
        <Icon className={`h-16 w-16 ${config.iconClass ?? ""}`} />
      </div>

      <div className="relative flex flex-col gap-3 p-5 flex-1">
        {/* Badge row */}
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-black/20`}>
            <Icon className={`h-3.5 w-3.5 text-cream-200 ${config.iconClass ?? ""}`} />
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${config.accent}`}>
            {config.label}
          </span>
          <span className="ml-auto text-xs text-cream-400/70 tabular-nums">{option.duration_hours}h</span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg font-semibold leading-snug text-cream-50">{option.title}</h3>

        {/* Description */}
        <p className="flex-1 text-sm leading-relaxed text-cream-300/80">{option.description}</p>

        {/* Tags */}
        {option.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {option.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-black/20 px-2 py-0.5 text-xs text-cream-400/80">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Location footer */}
        <div className="flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-cream-400/60">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{option.next_location}</span>
        </div>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 shadow-lg">
          <Check className="h-3.5 w-3.5 text-forest-900" strokeWidth={2.5} />
        </div>
      )}
    </button>
  );
}
