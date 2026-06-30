import type { FormEvent } from "react";
import { Sparkles } from "lucide-react";
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

  if (!trip) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 pb-16 animate-slide-up">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gold-500/30 dark:border-gold-500/20 bg-gradient-to-br from-forest-900 to-forest-800 p-6 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/20">
            <Sparkles className="h-4 w-4 text-gold-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cream-100">Refine this itinerary</h3>
            <p className="text-xs text-forest-400">Tell us what to change and we'll update the plan</p>
          </div>
        </div>

        <textarea
          id="feedback"
          name="feedback"
          rows={3}
          disabled={isLoading}
          placeholder="e.g. Make this less driving-heavy and add more underrated trails near Estes Park."
          className="w-full resize-none rounded-xl border border-forest-600 bg-forest-900/60 px-4 py-3 text-sm text-cream-100 placeholder:text-forest-500 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all disabled:opacity-50"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-forest-900 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
                Refining…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Update itinerary
              </>
            )}
          </button>
          <p className="text-xs text-forest-500">Changes apply to the full trip plan</p>
        </div>
      </form>
    </div>
  );
}
