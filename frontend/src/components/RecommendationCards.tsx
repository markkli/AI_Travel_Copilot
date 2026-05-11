import type { RecommendationCard } from "../types";

type RecommendationCardsProps = {
  cards: RecommendationCard[];
  onSelect: (card: RecommendationCard) => void;
};

export default function RecommendationCards({ cards, onSelect }: RecommendationCardsProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Travel ideas</h2>
          <p className="text-sm text-stone-600">Preview cards only. Full plans generate on demand.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(card)}
            className="rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-500 hover:shadow-md"
          >
            <div className="mb-3 h-24 rounded-md bg-gradient-to-br from-teal-100 via-sky-100 to-amber-100" />
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {card.duration_days} days · {card.budget_level}
            </p>
            <h3 className="mt-1 text-base font-semibold text-stone-950">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{card.short_description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {card.travel_styles.slice(0, 3).map((style) => (
                <span key={style} className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-700">
                  {style}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

