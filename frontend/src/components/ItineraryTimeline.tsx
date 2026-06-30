import { useState, type Dispatch, type SetStateAction } from "react";
import {
  PlaneLanding, PlaneTakeoff, Plane, Car, Train, Mountain,
  Camera, UtensilsCrossed, Bed, Timer, LogOut, ChevronDown, ChevronUp,
  MapPin, Clock, DollarSign, Lightbulb, type LucideIcon,
} from "lucide-react";
import type { SegmentType, TripPlan } from "../types";

type ItineraryTimelineProps = {
  trip: TripPlan | null;
};

const SEGMENT_CONFIG: Record<SegmentType, { icon: LucideIcon; bg: string; label: string }> = {
  arrival:   { icon: PlaneLanding,    bg: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",         label: "Arrival" },
  departure: { icon: PlaneTakeoff,    bg: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",         label: "Departure" },
  flight:    { icon: Plane,           bg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",     label: "Flight" },
  drive:     { icon: Car,             bg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", label: "Drive" },
  transit:   { icon: Train,           bg: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300", label: "Transit" },
  activity:  { icon: Mountain,        bg: "bg-forest-100 dark:bg-forest-700/50 text-forest-700 dark:text-forest-300", label: "Activity" },
  viewpoint: { icon: Camera,          bg: "bg-gold-300/30 dark:bg-gold-700/30 text-gold-700 dark:text-gold-400",  label: "Viewpoint" },
  meal:      { icon: UtensilsCrossed, bg: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", label: "Meal" },
  lodging:   { icon: Bed,             bg: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300", label: "Lodging" },
  buffer:    { icon: Timer,           bg: "bg-cream-200 dark:bg-forest-700/50 text-forest-500 dark:text-forest-400", label: "Buffer" },
};

const FALLBACK_SEGMENT = { icon: MapPin, bg: "bg-cream-200 dark:bg-forest-700/50 text-forest-500 dark:text-forest-400", label: "Stop" };

export default function ItineraryTimeline({ trip }: ItineraryTimelineProps) {
  const [openDays, setOpenDays] = useState<Set<number>>(() => new Set([1]));

  if (!trip) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16 text-center animate-fade-in">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-200 dark:bg-forest-800 mb-4">
          <MapPin className="h-8 w-8 text-forest-400 dark:text-forest-500" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-forest-900 dark:text-cream-100 mb-2">
          Your itinerary will appear here
        </h2>
        <p className="text-sm text-forest-500 dark:text-forest-400 max-w-sm mx-auto leading-relaxed">
          Describe your trip above and generate a structured day-by-day plan with stops, drives, meals, and buffers.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 pb-16 space-y-4 animate-fade-in">
      {/* Trip header */}
      <div className="rounded-2xl border border-cream-300 dark:border-forest-700 bg-white dark:bg-forest-800 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500 mb-1">
          {trip.destination_region}
        </p>
        <h2 className="font-serif text-3xl font-bold text-forest-900 dark:text-cream-100 mb-3 leading-tight">
          {trip.trip_title}
        </h2>
        <p className="text-sm leading-relaxed text-forest-600 dark:text-forest-300 mb-5">
          {trip.summary}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Travelers" value={String(trip.num_travelers)} />
          <StatCard label="Budget" value={trip.budget_level} />
          <StatCard label="Est. cost" value={trip.estimated_total_cost_range ?? "TBD"} className="col-span-2 sm:col-span-1" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {trip.travel_style.map((style) => (
            <span key={style} className="rounded-full bg-forest-900 dark:bg-gold-500/20 px-3 py-1 text-xs font-medium text-cream-100 dark:text-gold-300">
              {style}
            </span>
          ))}
        </div>
      </div>

      {/* Day cards */}
      {trip.days.map((day, dayIndex) => {
        const isOpen = openDays.has(day.day_number);
        const highlights = day.segments
          .filter((s) => ["activity", "viewpoint", "meal"].includes(s.segment_type))
          .slice(0, 3)
          .map((s) => s.destination ?? s.description);

        return (
          <article
            key={`${day.day_number}-${day.date}`}
            className="rounded-2xl border border-cream-300 dark:border-forest-700 bg-white dark:bg-forest-800 shadow-sm overflow-hidden animate-slide-up"
            style={{ animationDelay: `${dayIndex * 60}ms` }}
          >
            {/* Day header — always visible, clickable */}
            <button
              type="button"
              onClick={() => toggleDay(day.day_number, setOpenDays)}
              className="w-full px-6 py-5 flex flex-col gap-3 text-left md:flex-row md:items-start md:justify-between hover:bg-cream-50 dark:hover:bg-forest-700/30 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500 mb-1">
                  Day {day.day_number} · {day.date}
                </p>
                <h3 className="font-serif text-xl font-semibold text-forest-900 dark:text-cream-100 leading-snug mb-2">
                  {day.theme}
                </h3>
                <p className="text-sm text-forest-600 dark:text-forest-300 leading-relaxed line-clamp-2">
                  {day.summary}
                </p>
                {highlights.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {highlights.map((h) => (
                      <span key={h} className="rounded-full bg-cream-100 dark:bg-forest-700 px-2.5 py-1 text-xs text-forest-600 dark:text-forest-300">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1.5 flex-shrink-0">
                <div className="hidden space-y-1 text-right md:block">
                  <p className="text-xs text-forest-500 dark:text-forest-400">{day.starting_location} → {day.ending_location}</p>
                  {day.estimated_total_drive_time && (
                    <p className="text-xs text-forest-500 dark:text-forest-400">Drive: {day.estimated_total_drive_time}</p>
                  )}
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cream-100 dark:bg-forest-700">
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-forest-600 dark:text-forest-300" />
                    : <ChevronDown className="h-4 w-4 text-forest-600 dark:text-forest-300" />
                  }
                </div>
              </div>
            </button>

            {/* Segment timeline */}
            {isOpen && (
              <div className="border-t border-cream-200 dark:border-forest-700 px-6 py-5 space-y-0">
                {day.segments.map((segment, segIndex) => {
                  const config = SEGMENT_CONFIG[segment.segment_type] ?? FALLBACK_SEGMENT;
                  const Icon = config.icon;
                  const isLast = segIndex === day.segments.length - 1;

                  return (
                    <div
                      key={segment.sequence}
                      className="flex gap-4 animate-slide-up"
                      style={{ animationDelay: `${segIndex * 50}ms` }}
                    >
                      {/* Timeline column */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        {!isLast && (
                          <div className="mt-1 w-px flex-1 bg-cream-200 dark:bg-forest-700 min-h-[24px]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
                        {/* Time + type */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold tabular-nums text-forest-500 dark:text-forest-400">
                            {segment.start_time}
                          </span>
                          <span className="text-xs text-forest-400 dark:text-forest-600">–</span>
                          <span className="text-xs tabular-nums text-forest-400 dark:text-forest-600">
                            {segment.end_time}
                          </span>
                          <span className="rounded-full bg-cream-100 dark:bg-forest-700 px-2 py-0.5 text-xs font-medium text-forest-600 dark:text-forest-300">
                            {config.label}
                          </span>
                          {(segment.estimated_travel_time || segment.estimated_distance) && (
                            <span className="text-xs text-forest-400 dark:text-forest-500">
                              {segment.estimated_travel_time}{segment.estimated_travel_time && segment.estimated_distance ? " · " : ""}{segment.estimated_distance}
                            </span>
                          )}
                        </div>

                        {/* Destination / description */}
                        {segment.destination && (
                          <p className="text-sm font-semibold text-forest-900 dark:text-cream-100 mb-0.5">
                            {segment.destination}
                          </p>
                        )}
                        <p className="text-sm text-forest-600 dark:text-forest-300 leading-relaxed mb-2">
                          {segment.description}
                        </p>

                        {/* Detail pills */}
                        <div className="flex flex-wrap gap-3 text-xs text-forest-500 dark:text-forest-400">
                          {segment.cost_estimate && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {segment.cost_estimate}
                            </span>
                          )}
                          {segment.food_recommendation && (
                            <span className="flex items-center gap-1">
                              <UtensilsCrossed className="h-3 w-3" />
                              {segment.food_recommendation}
                            </span>
                          )}
                          {segment.tips.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              {segment.tips[0]}
                            </span>
                          )}
                          {segment.why_recommended && (
                            <span className="flex items-center gap-1 italic text-forest-400 dark:text-forest-500">
                              <Clock className="h-3 w-3" />
                              {segment.why_recommended}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function StatCard({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-cream-200 dark:border-forest-700 bg-cream-50 dark:bg-forest-900/50 px-4 py-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-forest-500 dark:text-forest-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-forest-900 dark:text-cream-100">{value}</p>
    </div>
  );
}

function toggleDay(dayNumber: number, setOpenDays: Dispatch<SetStateAction<Set<number>>>) {
  setOpenDays((current) => {
    const next = new Set(current);
    if (next.has(dayNumber)) next.delete(dayNumber);
    else next.add(dayNumber);
    return next;
  });
}
