import type { FormEvent } from "react";

import type { BudgetLevel, RecommendationCard, TripDraftRequest } from "../types";

type SearchPanelProps = {
  isLoading: boolean;
  selectedRecommendation: RecommendationCard | null;
  onSubmit: (payload: TripDraftRequest) => void;
};

export default function SearchPanel({
  isLoading,
  selectedRecommendation,
  onSubmit,
}: SearchPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const styles = String(form.get("travel_styles") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const interests = String(form.get("interests") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const avoid = String(form.get("avoid") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    onSubmit({
      query: String(form.get("query") ?? ""),
      start_date: String(form.get("start_date") ?? "") || null,
      end_date: String(form.get("end_date") ?? "") || null,
      origin_location: String(form.get("origin_location") ?? "") || null,
      budget_level: (String(form.get("budget_level") ?? "") || null) as BudgetLevel | null,
      num_travelers: Number(form.get("num_travelers") ?? 2),
      user_preferences: {
        travel_styles: styles,
        interests,
        avoid,
      },
    });
  }

  const defaultQuery =
    selectedRecommendation?.title ??
    "I want a 3-day scenic trip in the Rocky Mountains with no long drives, good for astrophotography and hidden trails.";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <label htmlFor="query" className="text-sm font-semibold text-stone-800">
          Travel intent
        </label>
        <textarea
          key={selectedRecommendation?.id ?? "custom-query"}
          id="query"
          name="query"
          rows={5}
          defaultValue={defaultQuery}
          className="mt-2 w-full resize-none rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start date" name="start_date" type="date" />
        <Field label="End date" name="end_date" type="date" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Origin" name="origin_location" />
        <Field label="Travelers" name="num_travelers" type="number" defaultValue="2" min="1" max="20" />
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        <label className="text-sm font-semibold text-stone-800">
          Budget
          <select
            name="budget_level"
            defaultValue=""
            className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Infer</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="luxury">Luxury</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Styles" name="travel_styles" defaultValue="scenic, photography, low-driving" />
        <Field label="Interests" name="interests" defaultValue="astrophotography, hidden trails" />
        <Field label="Avoid" name="avoid" defaultValue="long drives, crowds" />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {isLoading ? "Generating..." : "Generate itinerary"}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
};

function Field({ label, name, type = "text", defaultValue, min, max }: FieldProps) {
  return (
    <label htmlFor={name} className="text-sm font-semibold text-stone-800">
      {label}
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
        max={max}
        className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}
