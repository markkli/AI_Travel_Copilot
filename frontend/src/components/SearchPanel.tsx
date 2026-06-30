import { useState, useEffect, type FormEvent } from "react";
import { X } from "lucide-react";
import type { BudgetLevel, RecommendationCard, TripDraftRequest } from "../types";

const PRESET_STYLES = ["scenic", "photography", "nature", "culture", "food", "adventure", "low-driving", "wildlife", "walkable", "relaxed"];
const PRESET_INTERESTS = ["hiking", "astrophotography", "hidden trails", "wildlife", "museums", "local food", "architecture", "sunset views", "lakes & rivers"];
const PRESET_AVOID = ["long drives", "crowds", "expensive", "difficult hikes", "tourist traps"];

type SearchPanelProps = {
  isLoading: boolean;
  selectedRecommendation: RecommendationCard | null;
  onSubmit: (payload: TripDraftRequest) => void;
};

export default function SearchPanel({ isLoading, selectedRecommendation, onSubmit }: SearchPanelProps) {
  const [styles, setStyles] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);

  useEffect(() => {
    if (selectedRecommendation) {
      setStyles(selectedRecommendation.travel_styles ?? []);
    }
  }, [selectedRecommendation]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onSubmit({
      query: String(form.get("query") ?? ""),
      start_date: String(form.get("start_date") ?? "") || null,
      end_date: String(form.get("end_date") ?? "") || null,
      origin_location: String(form.get("origin_location") ?? "") || null,
      budget_level: (String(form.get("budget_level") ?? "") || null) as BudgetLevel | null,
      num_travelers: Number(form.get("num_travelers") ?? 2),
      user_preferences: { travel_styles: styles, interests, avoid },
    });
  }

  function toggle(value: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-cream-300 dark:border-forest-700/60 bg-white dark:bg-forest-950 shadow-lg shadow-forest-900/5 dark:shadow-black/50 overflow-hidden"
    >
      {/* Intent area */}
      <div className="p-5 pb-0">
        <label htmlFor="query" className="block text-xs font-semibold uppercase tracking-widest text-forest-500 dark:text-forest-400 mb-2">
          Describe your trip
        </label>
        <textarea
          key={selectedRecommendation?.id ?? "custom"}
          id="query"
          name="query"
          rows={4}
          defaultValue={selectedRecommendation?.title ?? ""}
          placeholder="e.g. 5-day scenic Alaska trip in July, low driving, wildlife photography, medium budget for 2"
          className="w-full resize-none rounded-xl border border-cream-300 dark:border-forest-600 bg-cream-50 dark:bg-forest-900/50 px-4 py-3 text-sm text-forest-900 dark:text-cream-100 placeholder:text-forest-400 dark:placeholder:text-forest-500 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all"
        />
      </div>

      {/* Structured fields */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-4">
        <Field label="Start date" name="start_date" type="date" />
        <Field label="End date" name="end_date" type="date" />
        <Field label="Origin" name="origin_location" placeholder="e.g. Denver, CO" />
        <Field label="Travelers" name="num_travelers" type="number" defaultValue="2" min="1" max="20" />
      </div>

      <div className="px-5 pt-3">
        <label className="block text-xs font-semibold uppercase tracking-widest text-forest-500 dark:text-forest-400 mb-2">
          Budget
        </label>
        <select
          name="budget_level"
          defaultValue=""
          className="w-full rounded-xl border border-cream-300 dark:border-forest-600 bg-cream-50 dark:bg-forest-900/50 px-4 py-2.5 text-sm text-forest-900 dark:text-cream-100 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all cursor-pointer"
        >
          <option value="">Infer from description</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="luxury">Luxury</option>
        </select>
      </div>

      {/* Divider */}
      <div className="mx-5 mt-5 border-t border-cream-200 dark:border-forest-700" />

      {/* Tag selectors */}
      <div className="p-5 space-y-4">
        <TagSelector label="Travel style" presets={PRESET_STYLES} selected={styles} onToggle={(v) => toggle(v, styles, setStyles)} />
        <TagSelector label="Interests" presets={PRESET_INTERESTS} selected={interests} onToggle={(v) => toggle(v, interests, setInterests)} />
        <TagSelector label="Avoid" presets={PRESET_AVOID} selected={avoid} onToggle={(v) => toggle(v, avoid, setAvoid)} accent="red" />
      </div>

      {/* Submit */}
      <div className="px-5 pb-5">
        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full overflow-hidden rounded-xl bg-forest-900 dark:bg-gold-500 px-5 py-3.5 text-sm font-semibold text-cream-100 dark:text-forest-950 transition-all duration-200 hover:bg-forest-800 dark:hover:bg-gold-400 dark:shadow-md dark:shadow-gold-500/20 dark:hover:shadow-lg dark:hover:shadow-gold-500/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream-400 border-t-transparent dark:border-forest-600 dark:border-t-transparent" />
              Generating…
            </span>
          ) : (
            "Generate itinerary →"
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  min,
  max,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-widest text-forest-500 dark:text-forest-400 mb-1.5">
        {label}
      </span>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
        max={max}
        placeholder={placeholder}
        className="w-full rounded-xl border border-cream-300 dark:border-forest-600 bg-cream-50 dark:bg-forest-900/50 px-3 py-2.5 text-sm text-forest-900 dark:text-cream-100 placeholder:text-forest-400 dark:placeholder:text-forest-500 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all"
      />
    </label>
  );
}

function TagSelector({
  label,
  presets,
  selected,
  onToggle,
  accent = "green",
}: {
  label: string;
  presets: string[];
  selected: string[];
  onToggle: (v: string) => void;
  accent?: "green" | "red";
}) {
  const activeClass =
    accent === "red"
      ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
      : "bg-forest-900 dark:bg-gold-500 border-forest-900 dark:border-gold-500 text-cream-100 dark:text-forest-900";

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-forest-500 dark:text-forest-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = selected.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onToggle(preset)}
              className={[
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer",
                isActive
                  ? activeClass
                  : "border-cream-300 dark:border-forest-600 text-forest-600 dark:text-forest-300 hover:border-forest-400 dark:hover:border-forest-400",
              ].join(" ")}
            >
              {preset}
              {isActive && <X className="h-3 w-3" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
