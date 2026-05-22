import type { TripPlan } from "../types";

type ItineraryTimelineProps = {
  trip: TripPlan | null;
};

export default function ItineraryTimeline({ trip }: ItineraryTimelineProps) {
  if (!trip) {
    return (
      <section className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-stone-900">Your itinerary will appear here</h2>
        <p className="mt-2 text-sm text-stone-600">
          Generate a trip to see a structured day-by-day timeline with stops, meals, drives, and buffers.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{trip.destination_region}</p>
        <h2 className="mt-1 text-2xl font-bold text-stone-950">{trip.trip_title}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{trip.summary}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <OverviewStat label="Travelers" value={`${trip.num_travelers}`} />
          <OverviewStat label="Budget" value={trip.budget_level} />
          <OverviewStat label="Estimated cost" value={trip.estimated_total_cost_range ?? "TBD"} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {trip.travel_style.map((style) => (
            <span key={style} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
              {style}
            </span>
          ))}
        </div>
      </div>

      {trip.days.map((day) => (
        <article key={`${day.day_number}-${day.date}`} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-stone-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Day {day.day_number} · {day.date}</p>
              <h3 className="text-xl font-semibold text-stone-950">{day.theme}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{day.summary}</p>
            </div>
            <div className="grid min-w-48 gap-1 text-sm text-stone-600">
              <span>Start: {day.starting_location}</span>
              <span>End: {day.ending_location}</span>
              <span>Drive: {day.estimated_total_drive_time ?? "TBD"}</span>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {day.segments.map((segment) => (
              <div key={segment.sequence} className="grid gap-3 md:grid-cols-[96px_1fr]">
                <div className="text-sm font-semibold text-stone-500">
                  {segment.start_time}
                  <div className="text-xs font-normal text-stone-400">{segment.end_time}</div>
                </div>
                <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase text-stone-700">
                      {segment.segment_type}
                    </span>
                    {segment.estimated_travel_time && (
                      <span className="text-xs text-stone-500">{segment.estimated_travel_time}</span>
                    )}
                    {segment.estimated_distance && (
                      <span className="text-xs text-stone-500">{segment.estimated_distance}</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-stone-900">{segment.description}</p>
                  {segment.why_recommended && (
                    <p className="mt-2 text-sm leading-6 text-stone-600">{segment.why_recommended}</p>
                  )}
                  {segment.cost_estimate && (
                    <p className="mt-2 text-sm text-stone-600">Estimated cost: {segment.cost_estimate}</p>
                  )}
                  {segment.tips.length > 0 && (
                    <p className="mt-2 text-sm text-stone-600">Tip: {segment.tips[0]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

type OverviewStatProps = {
  label: string;
  value: string;
};

function OverviewStat({ label, value }: OverviewStatProps) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-900">{value}</p>
    </div>
  );
}
