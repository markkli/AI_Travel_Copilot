import { Check, Loader2 } from "lucide-react";

export type StepStatus = "pending" | "active" | "done";

export interface GenerationStep {
  label: string;
  status: StepStatus;
}

interface GenerationStatusProps {
  steps: GenerationStep[];
}

export default function GenerationStatus({ steps }: GenerationStatusProps) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
      {/* Status steps */}
      <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 sm:gap-0">
            <div className="flex items-center gap-2">
              <StepIndicator status={step.status} />
              <span
                className={[
                  "text-sm font-medium transition-colors duration-300",
                  step.status === "done"
                    ? "text-forest-500 dark:text-gold-500 line-through"
                    : step.status === "active"
                    ? "text-forest-900 dark:text-cream-100"
                    : "text-cream-400 dark:text-forest-600",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-3 hidden h-px w-6 bg-cream-300 dark:bg-forest-700 sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Skeleton itinerary */}
      <div className="space-y-4">
        {/* Trip header skeleton */}
        <div className="rounded-2xl border border-cream-300 dark:border-forest-700 bg-white dark:bg-forest-800 p-6">
          <div className="shimmer mb-2 h-3 w-24 rounded-full" />
          <div className="shimmer mb-4 h-7 w-64 rounded-lg" />
          <div className="shimmer mb-2 h-4 w-full rounded" />
          <div className="shimmer h-4 w-4/5 rounded" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="shimmer h-14 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Day card skeletons */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-cream-300 dark:border-forest-700 bg-white dark:bg-forest-800 p-6"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="shimmer mb-2 h-3 w-20 rounded-full" />
                <div className="shimmer mb-3 h-6 w-48 rounded-lg" />
                <div className="shimmer h-3 w-full rounded" />
              </div>
              <div className="ml-4 hidden space-y-2 sm:block">
                <div className="shimmer h-3 w-28 rounded" />
                <div className="shimmer h-3 w-24 rounded" />
                <div className="shimmer h-3 w-20 rounded" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="shimmer h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIndicator({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold-500">
        <Check className="h-3.5 w-3.5 text-forest-900" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-forest-900 dark:bg-cream-100">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cream-100 dark:text-forest-900" />
      </div>
    );
  }
  return (
    <div className="h-6 w-6 flex-shrink-0 rounded-full border-2 border-cream-300 dark:border-forest-700" />
  );
}
