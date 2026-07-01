import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Loader2, Search } from "lucide-react";

import { fetchRecommendations } from "../api";
import type { RecommendationCard } from "../types";

const STYLE_FILTERS = ["scenic", "photography", "adventure", "culture", "food", "wildlife", "relaxed", "walkable"];
const BUDGET_FILTERS = ["low", "medium", "high", "luxury"] as const;
const DURATION_FILTERS = [
  { label: "Weekend", min: 1, max: 3 },
  { label: "1 week",  min: 4, max: 8 },
  { label: "2 weeks", min: 9, max: 14 },
  { label: "2+ weeks",min: 15, max: 999 },
];

const CARD_THEMES: Record<string, string> = {
  "northern-mn-aurora-weekend": "from-indigo-950 via-blue-900 to-forest-900",
  "grand-teton-photo-road-trip": "from-forest-900 via-forest-800 to-forest-700",
  "amsterdam-canal-culture":     "from-stone-900 via-amber-950 to-orange-950",
};
const DEFAULT_GRADIENT = "from-forest-900 via-forest-800 to-forest-700";

export default function ExplorePage() {
  const [cards, setCards] = useState<RecommendationCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [budgetFilter, setBudgetFilter] = useState<string | null>(null);
  const [durationFilter, setDurationFilter] = useState<typeof DURATION_FILTERS[number] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRecommendations()
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = cards.filter((c) => {
    if (styleFilter && !c.travel_styles.includes(styleFilter)) return false;
    if (budgetFilter && c.budget_level !== budgetFilter) return false;
    if (durationFilter && (c.duration_days < durationFilter.min || c.duration_days > durationFilter.max)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.destination_region.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function toggleStyle(s: string) { setStyleFilter(prev => prev === s ? null : s); }
  function toggleBudget(b: string) { setBudgetFilter(prev => prev === b ? null : b); }
  function toggleDuration(d: typeof DURATION_FILTERS[number]) { setDurationFilter(prev => prev?.label === d.label ? null : d); }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-forest-900 text-forest-900 dark:text-cream-100 transition-colors pt-16">
      {/* Page header */}
      <div className="border-b border-cream-200 dark:border-forest-800 bg-cream-50 dark:bg-forest-950 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500">
            Curated by AI
          </p>
          <h1 className="mb-3 font-serif text-4xl font-bold text-forest-900 dark:text-cream-50 md:text-5xl">
            Explore destinations
          </h1>
          <p className="max-w-xl text-base text-forest-600 dark:text-forest-300">
            Handpicked trip ideas you can turn into a full itinerary in seconds. Click any to auto-fill your planning form.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* ── Search + filters ─── */}
        <div className="mb-8 space-y-4">
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400 dark:text-forest-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search destinations…"
              className="w-full rounded-xl border border-cream-300 dark:border-forest-700 bg-white dark:bg-forest-800 pl-9 pr-4 py-2.5 text-sm text-forest-900 dark:text-cream-100 placeholder:text-forest-400 dark:placeholder:text-forest-500 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all"
            />
          </div>

          {/* Filter chips row */}
          <div className="flex flex-wrap gap-2">
            {/* Style */}
            {STYLE_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStyle(s)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  styleFilter === s
                    ? "bg-forest-900 dark:bg-gold-500 border-forest-900 dark:border-gold-500 text-cream-100 dark:text-forest-950"
                    : "border-cream-300 dark:border-forest-600 text-forest-600 dark:text-forest-300 hover:border-forest-400 dark:hover:border-forest-400",
                ].join(" ")}
              >
                {s}
              </button>
            ))}

            <div className="w-px self-stretch bg-cream-200 dark:bg-forest-700 mx-1" />

            {/* Budget */}
            {BUDGET_FILTERS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => toggleBudget(b)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer capitalize",
                  budgetFilter === b
                    ? "bg-forest-900 dark:bg-gold-500 border-forest-900 dark:border-gold-500 text-cream-100 dark:text-forest-950"
                    : "border-cream-300 dark:border-forest-600 text-forest-600 dark:text-forest-300 hover:border-forest-400 dark:hover:border-forest-400",
                ].join(" ")}
              >
                {b}
              </button>
            ))}

            <div className="w-px self-stretch bg-cream-200 dark:bg-forest-700 mx-1" />

            {/* Duration */}
            {DURATION_FILTERS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => toggleDuration(d)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  durationFilter?.label === d.label
                    ? "bg-forest-900 dark:bg-gold-500 border-forest-900 dark:border-gold-500 text-cream-100 dark:text-forest-950"
                    : "border-cream-300 dark:border-forest-600 text-forest-600 dark:text-forest-300 hover:border-forest-400 dark:hover:border-forest-400",
                ].join(" ")}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results ─── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-forest-400 dark:text-forest-500">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading destinations…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-xl text-forest-600 dark:text-forest-400 mb-2">No destinations match your filters</p>
            <p className="text-sm text-forest-400 dark:text-forest-500">
              {cards.length === 0
                ? "Start the backend to load curated destinations."
                : "Try removing a filter or two."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((card, i) => {
              const gradient = CARD_THEMES[card.id] ?? DEFAULT_GRADIENT;
              return (
                <Link
                  key={card.id}
                  to={`/?recommendation=${card.id}`}
                  className={[
                    "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-left",
                    "flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
                    "hover:shadow-forest-900/20 dark:hover:shadow-black/50 animate-slide-up",
                    gradient,
                  ].join(" ")}
                  style={{ animationDelay: `${i * 60}ms`, minHeight: "280px" }}
                >
                  {/* Decorative overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.10)_0%,transparent_60%)]" />

                  {/* Duration badge */}
                  <div className="mb-4 inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-xs font-medium text-white/90">
                    <Clock className="h-3 w-3" />
                    {card.duration_days} days
                  </div>

                  {/* Region */}
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/50">
                    {card.destination_region}
                  </p>

                  {/* Title */}
                  <h3 className="mb-2 font-serif text-2xl font-semibold leading-snug text-white transition-colors group-hover:text-gold-300">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="mb-4 flex-1 line-clamp-3 text-sm leading-relaxed text-white/60">
                    {card.short_description}
                  </p>

                  {/* Style chips */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {card.travel_styles.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-widest text-white/40 capitalize">
                      {card.budget_level} budget
                      {card.best_season && <span className="ml-2 text-white/30">· {card.best_season}</span>}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-gold-500">
                      <ArrowRight className="h-3.5 w-3.5 text-white transition-colors group-hover:text-forest-950" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Backend offline hint */}
        {!isLoading && cards.length === 0 && (
          <div className="mt-8 rounded-xl border border-cream-200 dark:border-forest-700 bg-white dark:bg-forest-800 p-4 text-sm text-forest-500 dark:text-forest-400">
            <strong className="text-forest-700 dark:text-forest-300">Backend offline:</strong>{" "}
            Run <code className="rounded bg-cream-100 dark:bg-forest-900 px-1.5 py-0.5 font-mono text-xs">LLM_MODE=mock uvicorn app.main:app --reload</code> in the{" "}
            <code className="rounded bg-cream-100 dark:bg-forest-900 px-1.5 py-0.5 font-mono text-xs">backend/</code> folder to see destinations.
          </div>
        )}
      </div>
    </div>
  );
}
