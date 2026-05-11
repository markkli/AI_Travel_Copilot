import type { FormEvent } from "react";

import type { TripPlan } from "../types";

type RefinementBoxProps = {
  trip: TripPlan | null;
  isLoading: boolean;
  onRefine: (feedback: string) => void;
};

export default function RefinementBox({ trip, isLoading, onRefine }: RefinementBoxProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const feedback = String(form.get("feedback") ?? "").trim();

    if (feedback) {
      onRefine(feedback);
      event.currentTarget.reset();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <label htmlFor="feedback" className="text-sm font-semibold text-stone-900">
        Refine this itinerary
      </label>
      <textarea
        id="feedback"
        name="feedback"
        rows={3}
        disabled={!trip || isLoading}
        placeholder="Make this less driving-heavy and add more underrated trails."
        className="mt-2 w-full resize-none rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-stone-100"
      />
      <button
        type="submit"
        disabled={!trip || isLoading}
        className="mt-3 w-full rounded-md border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
      >
        {isLoading ? "Refining..." : "Update itinerary"}
      </button>
    </form>
  );
}
