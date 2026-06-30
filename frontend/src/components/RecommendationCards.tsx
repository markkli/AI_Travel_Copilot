import { ArrowRight, Clock } from "lucide-react";
import type { RecommendationCard } from "../types";

type RecommendationCardsProps = {
  cards: RecommendationCard[];
  onSelect: (card: RecommendationCard) => void;
};

const CARD_THEMES: Record<string, { gradient: string; badge: string }> = {
  "northern-mn-aurora-weekend": {
    gradient: "from-indigo-950 via-blue-900 to-forest-900",
    badge: "bg-indigo-500/20 text-indigo-200 border-indigo-500/30",
  },
  "grand-teton-photo-road-trip": {
    gradient: "from-forest-900 via-forest-800 to-forest-700",
    badge: "bg-gold-500/20 text-gold-300 border-gold-500/30",
  },
  "amsterdam-canal-culture": {
    gradient: "from-stone-900 via-amber-950 to-orange-950",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  },
};

const DEFAULT_THEME = {
  gradient: "from-forest-900 via-forest-800 to-forest-700",
  badge: "bg-gold-500/20 text-gold-300 border-gold-500/30",
};

export default function RecommendationCards({ cards, onSelect }: RecommendationCardsProps) {
  if (cards.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500 mb-1">
            Inspiration
          </p>
          <h2 className="font-serif text-2xl font-semibold text-forest-900 dark:text-cream-100">
            Curated adventures
          </h2>
        </div>
        <span className="text-xs text-forest-500 dark:text-forest-400">Click to pre-fill →</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const theme = CARD_THEMES[card.id] ?? DEFAULT_THEME;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card)}
              className={[
                "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-left",
                "transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
                "hover:shadow-forest-900/30 dark:hover:shadow-black/50 cursor-pointer animate-slide-up",
                theme.gradient,
              ].join(" ")}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Decorative light overlay */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />

              {/* Duration badge */}
              <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${theme.badge}`}>
                <Clock className="h-3 w-3" />
                {card.duration_days} days
              </div>

              {/* Title */}
              <h3 className="mb-2 font-serif text-xl font-semibold leading-snug text-white transition-colors group-hover:text-gold-300">
                {card.title}
              </h3>

              {/* Description */}
              <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/60">
                {card.short_description}
              </p>

              {/* Style chips */}
              <div className="mb-5 flex flex-wrap gap-1.5">
                {card.travel_styles.map((style) => (
                  <span key={style} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
                    {style}
                  </span>
                ))}
              </div>

              {/* Footer row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-widest text-white/40">
                  {card.budget_level} budget
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-gold-500">
                  <ArrowRight className="h-3.5 w-3.5 text-white transition-colors group-hover:text-forest-900" />
                </div>
              </div>

              {card.best_season && (
                <p className="mt-3 text-xs text-white/30">Best: {card.best_season}</p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
