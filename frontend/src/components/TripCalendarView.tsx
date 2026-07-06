import { useState } from "react";
import {
  PlaneLanding, PlaneTakeoff, Plane, Car, Train, Mountain,
  Camera, UtensilsCrossed, Bed, Timer, MapPin, Clock,
  DollarSign, Lightbulb, Trash2, RotateCcw, CalendarCheck,
  Pencil, Shuffle, Plus, X, Check, Loader2, type LucideIcon,
} from "lucide-react";
import type { ItinerarySegment, SegmentType, TripPlan } from "../types";
import { downloadICS } from "../utils/exportCalendar";
import { suggestAlternatives, type AlternativeSeg, type SuggestAlternativesPayload } from "../api";

// ── Constants ─────────────────────────────────────────────────────────────────

const HOUR_PX       = 56;
const GRID_START    = 6;    // 6 AM
const GRID_END      = 23;   // 11 PM
const GRID_HOURS    = GRID_END - GRID_START;
const GRID_TOTAL_PX = GRID_HOURS * HOUR_PX;
const TIME_COL_W    = 52;
const COL_FIXED_PX  = 200; // px per column when > 5 days (forces horizontal scroll)

// ── Segment appearance ────────────────────────────────────────────────────────

type SegStyle = { icon: LucideIcon; bg: string; border: string; text: string; label: string };

const STYLES: Record<string, SegStyle> = {
  arrival:   { icon: PlaneLanding,    bg: "bg-sky-50 dark:bg-sky-950/60",         border: "border-sky-400 dark:border-sky-500",       text: "text-sky-800 dark:text-sky-200",       label: "Arrival"    },
  departure: { icon: PlaneTakeoff,    bg: "bg-sky-50 dark:bg-sky-950/60",         border: "border-sky-400 dark:border-sky-500",       text: "text-sky-800 dark:text-sky-200",       label: "Departure"  },
  flight:    { icon: Plane,           bg: "bg-blue-50 dark:bg-blue-950/60",       border: "border-blue-400 dark:border-blue-500",     text: "text-blue-800 dark:text-blue-200",     label: "Flight"     },
  drive:     { icon: Car,             bg: "bg-amber-50 dark:bg-amber-950/60",     border: "border-amber-400 dark:border-amber-500",   text: "text-amber-800 dark:text-amber-200",   label: "Drive"      },
  transit:   { icon: Train,           bg: "bg-purple-50 dark:bg-purple-950/60",   border: "border-purple-400 dark:border-purple-500", text: "text-purple-800 dark:text-purple-200", label: "Transit"    },
  activity:  { icon: Mountain,        bg: "bg-emerald-50 dark:bg-emerald-950/60", border: "border-emerald-500 dark:border-emerald-400",text: "text-emerald-800 dark:text-emerald-200",label: "Activity"  },
  viewpoint: { icon: Camera,          bg: "bg-yellow-50 dark:bg-yellow-950/60",   border: "border-yellow-500 dark:border-yellow-400", text: "text-yellow-800 dark:text-yellow-200", label: "Viewpoint"  },
  meal:      { icon: UtensilsCrossed, bg: "bg-orange-50 dark:bg-orange-950/60",   border: "border-orange-400 dark:border-orange-500", text: "text-orange-800 dark:text-orange-200", label: "Meal"       },
  lodging:   { icon: Bed,             bg: "bg-indigo-50 dark:bg-indigo-950/60",   border: "border-indigo-400 dark:border-indigo-500", text: "text-indigo-800 dark:text-indigo-200", label: "Lodging"    },
  buffer:    { icon: Timer,           bg: "bg-stone-50 dark:bg-stone-900/60",     border: "border-stone-300 dark:border-stone-600",   text: "text-stone-700 dark:text-stone-300",   label: "Free time"  },
};
const DEFAULT_STYLE: SegStyle = {
  icon: MapPin,
  bg: "bg-cream-50 dark:bg-forest-800/60",
  border: "border-forest-400",
  text: "text-forest-700 dark:text-forest-300",
  label: "Stop",
};

// ── Local types ───────────────────────────────────────────────────────────────

type SegOverride = { title?: string; description?: string; start_time?: string; end_time?: string };
type AddedSeg = { id: string; dayNumber: number; title: string; description: string; segment_type: string; start_time: string; end_time: string };
type PanelMode = "view" | "edit" | "alternatives" | "addEvent";
type EditForm = { title: string; description: string; start_time: string; end_time: string };
type AddForm = { dayNumber: number; title: string; description: string; segment_type: string; start_time: string; end_time: string };

// ── Time utilities ────────────────────────────────────────────────────────────

function parseToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const mer = m[3]?.toLowerCase();
  if (mer === "pm" && h !== 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return h * 60 + min;
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  const min = parseToMinutes(t);
  if (min === null) return t;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function sKey(dayNum: number, seq: number) {
  return `${dayNum}-${seq}`;
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = { trip: TripPlan };

export default function TripCalendarView({ trip }: Props) {
  const [deleted, setDeleted]         = useState(new Set<string>());
  const [overrides, setOverrides]     = useState(new Map<string, SegOverride>());
  const [added, setAdded]             = useState<AddedSeg[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [panelMode, setPanelMode]     = useState<PanelMode>("view");
  const [editForm, setEditForm]       = useState<EditForm | null>(null);
  const [addForm, setAddForm]         = useState<AddForm | null>(null);
  const [altLoading, setAltLoading]   = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeSeg[]>([]);

  const numDays    = trip.days.length;
  const useFixed   = numDays > 5;
  const innerWidth = useFixed
    ? `${TIME_COL_W + numDays * COL_FIXED_PX}px`
    : "100%";
  const colFlex    = useFixed ? "none" : "1 1 0%";
  const colWidth   = useFixed ? `${COL_FIXED_PX}px` : undefined;
  const hours      = Array.from({ length: GRID_HOURS + 1 }, (_, i) => GRID_START + i);
  const removedCount = deleted.size;
  const addedCount   = added.length;

  // ── Derived selection ────────────────────────────────────────────────────

  const selectedOriginal = (() => {
    if (!selectedKey || selectedKey.startsWith("added-")) return null;
    const [dayStr, seqStr] = selectedKey.split("-");
    const day = trip.days.find((d) => d.day_number === parseInt(dayStr));
    const seg = day?.segments.find((s) => s.sequence === parseInt(seqStr));
    return seg && day ? { seg, dayNum: day.day_number } : null;
  })();

  const selectedAdded = selectedKey?.startsWith("added-")
    ? added.find((a) => `added-${a.id}` === selectedKey) ?? null
    : null;

  // ── Mutations ────────────────────────────────────────────────────────────

  function toggleDelete(key: string) {
    setDeleted((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  function applyOverride(key: string, patch: SegOverride) {
    setOverrides((prev) => new Map(prev).set(key, { ...prev.get(key), ...patch }));
  }

  function saveEdit() {
    if (editForm && selectedKey) applyOverride(selectedKey, editForm);
    setEditForm(null);
    setPanelMode("view");
  }

  function submitAddForm() {
    if (!addForm?.title.trim()) return;
    const newSeg: AddedSeg = { ...addForm, id: Math.random().toString(36).slice(2) };
    setAdded((prev) => [...prev, newSeg]);
    setAddForm(null);
    setSelectedKey(`added-${newSeg.id}`);
    setPanelMode("view");
  }

  function removeAdded(id: string) {
    setAdded((prev) => prev.filter((a) => a.id !== id));
    setSelectedKey(null);
    setPanelMode("view");
  }

  async function loadAlternatives(seg: ItinerarySegment, dayNum: number) {
    const day = trip.days.find((d) => d.day_number === dayNum);
    const ov  = selectedKey ? overrides.get(selectedKey) : null;
    setAltLoading(true);
    setAlternatives([]);
    setPanelMode("alternatives");
    const payload: SuggestAlternativesPayload = {
      destination: trip.destination_region,
      day_number: dayNum,
      day_date: day?.date ?? null,
      segment_type: seg.segment_type,
      current_title: ov?.title ?? seg.destination ?? seg.description.slice(0, 60),
      current_description: ov?.description ?? seg.description,
      start_time: ov?.start_time ?? seg.start_time ?? "09:00",
      end_time: ov?.end_time ?? seg.end_time ?? "10:00",
      budget_level: trip.budget_level,
    };
    try {
      const resp = await suggestAlternatives(payload);
      setAlternatives(resp.alternatives);
    } catch {
      setAlternatives([]);
    } finally {
      setAltLoading(false);
    }
  }

  function applyAlternative(alt: AlternativeSeg) {
    if (selectedKey) {
      applyOverride(selectedKey, {
        title: alt.title,
        description: alt.description,
        start_time: alt.start_time,
        end_time: alt.end_time,
      });
    }
    setAlternatives([]);
    setPanelMode("view");
  }

  function openEdit() {
    if (!selectedOriginal || !selectedKey) return;
    const ov = overrides.get(selectedKey);
    setEditForm({
      title: ov?.title ?? selectedOriginal.seg.destination ?? selectedOriginal.seg.description.slice(0, 60),
      description: ov?.description ?? selectedOriginal.seg.description,
      start_time: ov?.start_time ?? selectedOriginal.seg.start_time ?? "",
      end_time: ov?.end_time ?? selectedOriginal.seg.end_time ?? "",
    });
    setPanelMode("edit");
  }

  function openAddForm(dayNum: number, startTime = "09:00", endTime = "10:00") {
    setAddForm({ dayNumber: dayNum, title: "", description: "", segment_type: "activity", start_time: startTime, end_time: endTime });
    setSelectedKey(null);
    setPanelMode("addEvent");
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dayNum: number) {
    if ((e.target as HTMLElement).closest("[data-seg]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = Math.max(0, e.clientY - rect.top);
    const totalMin = GRID_START * 60 + Math.round((relY / HOUR_PX) * 60 / 30) * 30;
    const sh = Math.min(Math.floor(totalMin / 60), GRID_END - 1);
    const sm = totalMin % 60;
    const eh = Math.min(sh + 1, GRID_END);
    const p = (n: number) => String(n).padStart(2, "0");
    openAddForm(dayNum, `${p(sh)}:${p(sm)}`, `${p(eh)}:${p(sm)}`);
  }

  function handleExport() {
    const filtered: TripPlan = {
      ...trip,
      days: trip.days.map((d) => ({
        ...d,
        segments: [
          ...d.segments
            .filter((s) => !deleted.has(sKey(d.day_number, s.sequence)))
            .map((s) => {
              const ov = overrides.get(sKey(d.day_number, s.sequence));
              if (!ov) return s;
              return {
                ...s,
                destination: ov.title ?? s.destination,
                description: ov.description ?? s.description,
                start_time: ov.start_time ?? s.start_time,
                end_time: ov.end_time ?? s.end_time,
              };
            }),
          ...added
            .filter((a) => a.dayNumber === d.day_number)
            .map((a, i) => ({
              sequence: 1000 + i,
              segment_type: a.segment_type as SegmentType,
              start_time: a.start_time,
              end_time: a.end_time,
              destination: a.title,
              description: a.description,
              tips: [] as string[],
              constraints_satisfied: [] as string[],
            })),
        ].sort((a, b) => (parseToMinutes(a.start_time) ?? 0) - (parseToMinutes(b.start_time) ?? 0)),
      })),
    };
    downloadICS(filtered);
  }

  // ── Panel content ────────────────────────────────────────────────────────

  function renderPanel() {
    if (panelMode === "addEvent" && addForm) {
      return (
        <AddEventPanel
          form={addForm}
          tripDays={trip.days.map((d) => ({ day_number: d.day_number, date: d.date }))}
          onChange={setAddForm}
          onSubmit={submitAddForm}
          onCancel={() => { setAddForm(null); setPanelMode("view"); }}
        />
      );
    }
    if (selectedAdded) {
      return (
        <AddedDetailPanel
          seg={selectedAdded}
          onRemove={() => removeAdded(selectedAdded.id)}
          onClose={() => { setSelectedKey(null); setPanelMode("view"); }}
        />
      );
    }
    if (selectedOriginal) {
      const ov = selectedKey ? overrides.get(selectedKey) : null;
      const isDeleted = !!selectedKey && deleted.has(selectedKey);
      if (panelMode === "edit" && editForm) {
        return (
          <EditPanel
            form={editForm}
            onChange={setEditForm}
            onSave={saveEdit}
            onCancel={() => { setEditForm(null); setPanelMode("view"); }}
          />
        );
      }
      if (panelMode === "alternatives") {
        return (
          <AlternativesPanel
            loading={altLoading}
            alternatives={alternatives}
            onSelect={applyAlternative}
            onClose={() => { setAlternatives([]); setPanelMode("view"); }}
          />
        );
      }
      return (
        <ViewPanel
          seg={selectedOriginal.seg}
          override={ov ?? null}
          isDeleted={isDeleted}
          onToggleDelete={() => selectedKey && toggleDelete(selectedKey)}
          onEdit={openEdit}
          onAlternatives={() => loadAlternatives(selectedOriginal.seg, selectedOriginal.dayNum)}
          onClose={() => { setSelectedKey(null); setPanelMode("view"); }}
        />
      );
    }
    return (
      <EmptyDetail onAddEvent={() => openAddForm(trip.days[0]?.day_number ?? 1)} />
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Trip header */}
      <div className="px-6 py-4 border-b border-cream-200 dark:border-forest-800 flex-none">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500 mb-0.5">
              {trip.destination_region}
            </p>
            <h2 className="font-serif text-xl font-bold text-forest-900 dark:text-cream-100 leading-tight">
              {trip.trip_title}
            </h2>
            <p className="mt-0.5 text-xs text-forest-500 dark:text-forest-400">
              {trip.start_date} → {trip.end_date} · {trip.num_travelers} traveler{trip.num_travelers !== 1 ? "s" : ""} · {trip.budget_level} budget
            </p>
            {(removedCount > 0 || addedCount > 0) && (
              <p className="mt-1 text-xs text-forest-400 dark:text-forest-500">
                {removedCount > 0 && `${removedCount} removed`}
                {removedCount > 0 && addedCount > 0 && " · "}
                {addedCount > 0 && `${addedCount} added`}
                {" · only kept events export"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-forest-900 dark:bg-gold-500 px-4 py-2.5 text-sm font-semibold text-cream-100 dark:text-forest-950 hover:bg-forest-800 dark:hover:bg-gold-400 transition-all cursor-pointer shadow-md flex-none"
          >
            <CalendarCheck className="h-4 w-4" />
            Export to Calendar
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Calendar (scrolls both axes) ── */}
        <div className="flex-1 overflow-auto min-w-0">
          <div style={{ width: innerWidth }}>

            {/* STICKY DAY HEADER ROW */}
            <div className="sticky top-0 z-20 flex border-b border-cream-200 dark:border-forest-800 bg-cream-50 dark:bg-forest-950">
              {/* Corner: sticky left */}
              <div
                className="sticky left-0 z-30 flex-none border-r border-cream-200 dark:border-forest-800 bg-cream-50 dark:bg-forest-950"
                style={{ width: TIME_COL_W }}
              />
              {/* Day header cells */}
              {trip.days.map((day) => {
                const dayAddedCount = added.filter((a) => a.dayNumber === day.day_number).length;
                const dayDeletedCount = day.segments.filter((s) => deleted.has(sKey(day.day_number, s.sequence))).length;
                return (
                  <div
                    key={day.day_number}
                    className="border-r border-cream-200 dark:border-forest-800 px-2 py-2 min-w-0"
                    style={{ flex: colFlex, width: colWidth }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-forest-900 dark:text-cream-100 leading-tight">
                          Day {day.day_number}
                        </p>
                        <p className="text-[10px] text-forest-400 dark:text-forest-500 leading-tight">{day.date}</p>
                        <p
                          className="text-[10px] text-forest-600 dark:text-forest-300 leading-tight mt-0.5 truncate"
                          title={day.theme}
                        >
                          {day.theme}
                        </p>
                        {(dayDeletedCount > 0 || dayAddedCount > 0) && (
                          <p className="text-[9px] text-forest-400 dark:text-forest-600 mt-0.5">
                            {dayDeletedCount > 0 && `-${dayDeletedCount}`}
                            {dayDeletedCount > 0 && dayAddedCount > 0 && " "}
                            {dayAddedCount > 0 && `+${dayAddedCount}`}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        title="Add event to this day"
                        onClick={() => openAddForm(day.day_number)}
                        className="flex-none w-5 h-5 rounded-full bg-cream-200 dark:bg-forest-800 flex items-center justify-center text-forest-500 dark:text-forest-400 hover:bg-gold-100 dark:hover:bg-gold-900/30 hover:text-gold-600 dark:hover:text-gold-400 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* GRID BODY */}
            <div className="flex" style={{ height: `${GRID_TOTAL_PX + 24}px`, paddingBottom: 24 }}>
              {/* Time labels: sticky left */}
              <div
                className="sticky left-0 z-10 flex-none border-r border-cream-200 dark:border-forest-800 bg-cream-50 dark:bg-forest-950 relative"
                style={{ width: TIME_COL_W }}
              >
                {hours.map((h) => {
                  const label = h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
                  return (
                    <div
                      key={h}
                      className="absolute right-0 flex items-center justify-end pr-2"
                      style={{ top: (h - GRID_START) * HOUR_PX - 8, height: 16 }}
                    >
                      <span className="text-[10px] font-medium text-forest-400 dark:text-forest-600 whitespace-nowrap">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {trip.days.map((day) => {
                const dayAddedSegs = added.filter((a) => a.dayNumber === day.day_number);
                return (
                  <div
                    key={day.day_number}
                    className="relative border-r border-cream-200 dark:border-forest-800 cursor-crosshair"
                    style={{ flex: colFlex, width: colWidth }}
                    onClick={(e) => handleColumnClick(e, day.day_number)}
                  >
                    {/* Hour lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-cream-200/60 dark:border-forest-800/50 pointer-events-none"
                        style={{ top: (h - GRID_START) * HOUR_PX }}
                      />
                    ))}

                    {/* Original segments */}
                    {day.segments.map((seg) => {
                      const key = sKey(day.day_number, seg.sequence);
                      const ov  = overrides.get(key);
                      const effective = ov
                        ? { ...seg, destination: ov.title ?? seg.destination, description: ov.description ?? seg.description, start_time: ov.start_time ?? seg.start_time, end_time: ov.end_time ?? seg.end_time }
                        : seg;
                      const startMin = parseToMinutes(effective.start_time);
                      const endMin   = parseToMinutes(effective.end_time);
                      if (startMin === null || endMin === null) return null;
                      const topPx    = Math.max(0, ((startMin - GRID_START * 60) / 60) * HOUR_PX);
                      const heightPx = Math.max(28, ((Math.max(endMin, startMin + 20) - startMin) / 60) * HOUR_PX);
                      const style    = STYLES[effective.segment_type] ?? DEFAULT_STYLE;
                      return (
                        <SegmentBlock
                          key={key}
                          seg={effective}
                          style={style}
                          topPx={topPx}
                          heightPx={heightPx}
                          isSelected={selectedKey === key}
                          isDeleted={deleted.has(key)}
                          hasOverride={!!ov}
                          onClick={(e) => { e.stopPropagation(); setSelectedKey(key); setPanelMode("view"); setEditForm(null); setAlternatives([]); }}
                        />
                      );
                    })}

                    {/* Added segments */}
                    {dayAddedSegs.map((a) => {
                      const key      = `added-${a.id}`;
                      const startMin = parseToMinutes(a.start_time);
                      const endMin   = parseToMinutes(a.end_time);
                      if (startMin === null || endMin === null) return null;
                      const topPx    = Math.max(0, ((startMin - GRID_START * 60) / 60) * HOUR_PX);
                      const heightPx = Math.max(28, ((Math.max(endMin, startMin + 20) - startMin) / 60) * HOUR_PX);
                      const style    = STYLES[a.segment_type] ?? DEFAULT_STYLE;
                      return (
                        <SegmentBlock
                          key={key}
                          seg={{ ...a, destination: a.title, tips: [], constraints_satisfied: [], sequence: 0, segment_type: a.segment_type as SegmentType }}
                          style={style}
                          topPx={topPx}
                          heightPx={heightPx}
                          isSelected={selectedKey === key}
                          isDeleted={false}
                          hasOverride={false}
                          isAdded
                          onClick={(e) => { e.stopPropagation(); setSelectedKey(key); setPanelMode("view"); }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Detail panel (desktop) ── */}
        <div className="hidden lg:flex flex-col w-80 flex-none border-l border-cream-200 dark:border-forest-800 bg-cream-50/40 dark:bg-forest-900/40 overflow-y-auto">
          {renderPanel()}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {(selectedKey !== null || panelMode === "addEvent") && (
        <div className="lg:hidden border-t border-cream-200 dark:border-forest-800 bg-white dark:bg-forest-800 max-h-[45vh] overflow-y-auto">
          {renderPanel()}
        </div>
      )}
    </div>
  );
}

// ── Segment block ─────────────────────────────────────────────────────────────

function SegmentBlock({
  seg, style, topPx, heightPx, isSelected, isDeleted, hasOverride, isAdded, onClick,
}: {
  seg: ItinerarySegment;
  style: SegStyle;
  topPx: number;
  heightPx: number;
  isSelected: boolean;
  isDeleted: boolean;
  hasOverride: boolean;
  isAdded?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const Icon  = style.icon;
  const short = heightPx < 44;
  const title = seg.destination ?? seg.description.slice(0, 50);

  return (
    <button
      data-seg="1"
      type="button"
      onClick={onClick}
      className={[
        "absolute left-1 right-1 rounded-xl border-l-4 px-2 text-left transition-all duration-150 cursor-pointer overflow-hidden",
        style.bg, style.border,
        isSelected ? "ring-2 ring-gold-400 shadow-md z-10" : "hover:ring-1 hover:ring-forest-400/40 hover:shadow-sm",
        isDeleted ? "opacity-25" : "",
        isAdded ? "ring-1 ring-gold-300 dark:ring-gold-600" : "",
      ].join(" ")}
      style={{ top: topPx, height: heightPx, paddingTop: short ? 4 : 6, paddingBottom: short ? 4 : 6 }}
    >
      <div className={`flex items-start gap-1.5 ${short ? "items-center" : ""}`}>
        <Icon className={`h-3 w-3 flex-none ${style.text} ${short ? "" : "mt-0.5"}`} />
        <div className="min-w-0 flex-1">
          <p className={[
            "text-xs font-semibold leading-tight",
            style.text,
            short ? "truncate" : "line-clamp-2",
          ].join(" ")}>
            {title}
          </p>
          {!short && (
            <p className="text-[10px] text-forest-500 dark:text-forest-400 mt-0.5 leading-tight">
              {fmtTime(seg.start_time)}–{fmtTime(seg.end_time)}
            </p>
          )}
          {hasOverride && !isDeleted && (
            <span className="text-[9px] text-gold-600 dark:text-gold-400 font-medium">edited</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── View panel ────────────────────────────────────────────────────────────────

function ViewPanel({
  seg, override, isDeleted, onToggleDelete, onEdit, onAlternatives, onClose,
}: {
  seg: ItinerarySegment;
  override: SegOverride | null;
  isDeleted: boolean;
  onToggleDelete: () => void;
  onEdit: () => void;
  onAlternatives: () => void;
  onClose: () => void;
}) {
  const style = STYLES[seg.segment_type] ?? DEFAULT_STYLE;
  const Icon  = style.icon;
  const title = override?.title ?? seg.destination ?? seg.description.slice(0, 60);
  const desc  = override?.description ?? seg.description;
  const t0    = override?.start_time ?? seg.start_time;
  const t1    = override?.end_time ?? seg.end_time;

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <button type="button" onClick={onClose} className="lg:hidden text-xs text-forest-400 hover:text-forest-700 cursor-pointer flex items-center gap-1">
        <X className="h-3 w-3" /> Close
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`flex-none flex h-9 w-9 items-center justify-center rounded-xl ${style.bg} ${style.border} border`}>
          <Icon className={`h-4 w-4 ${style.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-400 dark:text-forest-500">{style.label}</p>
          <h3 className="font-serif font-semibold text-forest-900 dark:text-cream-100 leading-snug">{title}</h3>
          {override && <p className="text-[10px] text-gold-600 dark:text-gold-400 mt-0.5">✎ Edited</p>}
        </div>
      </div>

      {/* Time */}
      {(t0 || t1) && (
        <DetailRow icon={Clock} label="Time">
          {fmtTime(t0)}{t1 ? ` – ${fmtTime(t1)}` : ""}
        </DetailRow>
      )}

      {/* Description */}
      {desc && (
        <p className="text-sm leading-relaxed text-forest-600 dark:text-forest-300">{desc}</p>
      )}

      {/* Cost */}
      {seg.cost_estimate && (
        <DetailRow icon={DollarSign} label="Est. cost">{seg.cost_estimate}</DetailRow>
      )}

      {/* Travel time */}
      {seg.estimated_travel_time && (
        <DetailRow icon={MapPin} label="Travel time">{seg.estimated_travel_time}</DetailRow>
      )}

      {/* Tips */}
      {seg.tips.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-gold-500" />
            <span className="text-xs font-semibold text-forest-500 dark:text-forest-400 uppercase tracking-wide">Tips</span>
          </div>
          <ul className="space-y-1.5">
            {seg.tips.slice(0, 3).map((tip, i) => (
              <li key={i} className="text-xs text-forest-600 dark:text-forest-300 leading-relaxed pl-3 border-l-2 border-cream-300 dark:border-forest-700">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2 pt-1">
        {!isDeleted && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium bg-cream-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300 hover:bg-cream-200 dark:hover:bg-forest-700 transition-all cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit details
            </button>
            <button
              type="button"
              onClick={onAlternatives}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 hover:bg-gold-100 dark:hover:bg-gold-900/30 transition-all cursor-pointer border border-gold-200 dark:border-gold-700/40"
            >
              <Shuffle className="h-3.5 w-3.5" /> Suggest alternatives
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onToggleDelete}
          className={[
            "w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all cursor-pointer",
            isDeleted
              ? "bg-forest-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300 hover:bg-forest-200 dark:hover:bg-forest-700"
              : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60",
          ].join(" ")}
        >
          {isDeleted
            ? <><RotateCcw className="h-4 w-4" /> Restore to trip</>
            : <><Trash2 className="h-4 w-4" /> Remove from trip</>}
        </button>
      </div>
    </div>
  );
}

// ── Edit panel ────────────────────────────────────────────────────────────────

function EditPanel({
  form, onChange, onSave, onCancel,
}: {
  form: EditForm;
  onChange: (f: EditForm) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputCls = "w-full rounded-lg border border-cream-300 dark:border-forest-700 bg-white dark:bg-forest-800 px-3 py-1.5 text-sm text-forest-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-400 dark:focus:ring-gold-500";
  const labelCls = "text-xs font-semibold text-forest-500 dark:text-forest-400 uppercase tracking-wide";

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-semibold text-forest-900 dark:text-cream-100">Edit segment</h3>
        <button type="button" onClick={onCancel} className="text-forest-400 hover:text-forest-700 cursor-pointer"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-3">
        <div>
          <label className={labelCls}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            className={`${inputCls} mt-1`}
            placeholder="Activity name or location"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Start</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => onChange({ ...form, start_time: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>
          <div>
            <label className={labelCls}>End</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => onChange({ ...form, end_time: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            rows={3}
            className={`${inputCls} mt-1 resize-none`}
            placeholder="Additional details or notes"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2 text-sm font-medium bg-cream-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300 hover:bg-cream-200 dark:hover:bg-forest-700 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold bg-forest-900 dark:bg-gold-500 text-cream-100 dark:text-forest-950 hover:bg-forest-800 dark:hover:bg-gold-400 transition-all cursor-pointer"
        >
          <Check className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}

// ── Alternatives panel ────────────────────────────────────────────────────────

function AlternativesPanel({
  loading, alternatives, onSelect, onClose,
}: {
  loading: boolean;
  alternatives: AlternativeSeg[];
  onSelect: (alt: AlternativeSeg) => void;
  onClose: () => void;
}) {
  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-semibold text-forest-900 dark:text-cream-100">Alternatives</h3>
          <p className="text-xs text-forest-500 dark:text-forest-400">Pick one to swap in</p>
        </div>
        <button type="button" onClick={onClose} className="text-forest-400 hover:text-forest-700 cursor-pointer"><X className="h-4 w-4" /></button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-8 text-forest-400">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
          <p className="text-xs">Generating alternatives…</p>
        </div>
      ) : alternatives.length === 0 ? (
        <p className="text-sm text-forest-500 dark:text-forest-400 text-center py-6">No alternatives returned. Try again.</p>
      ) : (
        <div className="space-y-2">
          {alternatives.map((alt, i) => {
            const style = STYLES[alt.segment_type] ?? DEFAULT_STYLE;
            const Icon  = style.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(alt)}
                className={`w-full text-left rounded-xl border-l-4 p-3 transition-all cursor-pointer hover:shadow-md ${style.bg} ${style.border} hover:ring-1 hover:ring-gold-400`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-3.5 w-3.5 flex-none mt-0.5 ${style.text}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold leading-snug ${style.text}`}>{alt.title}</p>
                    <p className="text-[10px] text-forest-500 dark:text-forest-400 mt-0.5">
                      {fmtTime(alt.start_time)}–{fmtTime(alt.end_time)}
                      {alt.cost_estimate && ` · ${alt.cost_estimate}`}
                    </p>
                    <p className="text-[11px] text-forest-600 dark:text-forest-300 mt-1 leading-snug line-clamp-2">{alt.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Add event panel ───────────────────────────────────────────────────────────

function AddEventPanel({
  form, tripDays, onChange, onSubmit, onCancel,
}: {
  form: AddForm;
  tripDays: { day_number: number; date: string }[];
  onChange: (f: AddForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputCls = "w-full rounded-lg border border-cream-300 dark:border-forest-700 bg-white dark:bg-forest-800 px-3 py-1.5 text-sm text-forest-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-400";
  const labelCls = "text-xs font-semibold text-forest-500 dark:text-forest-400 uppercase tracking-wide";

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-semibold text-forest-900 dark:text-cream-100">Add event</h3>
          <p className="text-xs text-forest-500 dark:text-forest-400">Click on empty space in any column to set the time</p>
        </div>
        <button type="button" onClick={onCancel} className="text-forest-400 hover:text-forest-700 cursor-pointer"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-3">
        <div>
          <label className={labelCls}>Day</label>
          <select
            value={form.dayNumber}
            onChange={(e) => onChange({ ...form, dayNumber: parseInt(e.target.value) })}
            className={`${inputCls} mt-1`}
          >
            {tripDays.map((d) => (
              <option key={d.day_number} value={d.day_number}>Day {d.day_number} — {d.date}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            className={`${inputCls} mt-1`}
            placeholder="e.g. Coffee at local café"
            autoFocus
          />
        </div>

        <div>
          <label className={labelCls}>Type</label>
          <select
            value={form.segment_type}
            onChange={(e) => onChange({ ...form, segment_type: e.target.value })}
            className={`${inputCls} mt-1`}
          >
            {Object.entries(STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Start</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => onChange({ ...form, start_time: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>
          <div>
            <label className={labelCls}>End</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => onChange({ ...form, end_time: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes <span className="normal-case font-normal">(optional)</span></label>
          <textarea
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            rows={2}
            className={`${inputCls} mt-1 resize-none`}
            placeholder="Any details or reminders"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2 text-sm font-medium bg-cream-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300 hover:bg-cream-200 dark:hover:bg-forest-700 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!form.title.trim()}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold bg-forest-900 dark:bg-gold-500 text-cream-100 dark:text-forest-950 hover:bg-forest-800 dark:hover:bg-gold-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" /> Add event
        </button>
      </div>
    </div>
  );
}

// ── Added seg detail panel ────────────────────────────────────────────────────

function AddedDetailPanel({
  seg, onRemove, onClose,
}: {
  seg: AddedSeg;
  onRemove: () => void;
  onClose: () => void;
}) {
  const style = STYLES[seg.segment_type] ?? DEFAULT_STYLE;
  const Icon  = style.icon;

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <button type="button" onClick={onClose} className="lg:hidden text-xs text-forest-400 hover:text-forest-700 cursor-pointer flex items-center gap-1">
        <X className="h-3 w-3" /> Close
      </button>

      <div className="flex items-start gap-3">
        <div className={`flex-none flex h-9 w-9 items-center justify-center rounded-xl ${style.bg} ${style.border} border`}>
          <Icon className={`h-4 w-4 ${style.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600 dark:text-gold-400">Added by you · {style.label}</p>
          <h3 className="font-serif font-semibold text-forest-900 dark:text-cream-100 leading-snug">{seg.title}</h3>
        </div>
      </div>

      <DetailRow icon={Clock} label="Time">
        {fmtTime(seg.start_time)} – {fmtTime(seg.end_time)}
      </DetailRow>

      {seg.description && (
        <p className="text-sm leading-relaxed text-forest-600 dark:text-forest-300">{seg.description}</p>
      )}

      <p className="text-xs text-forest-400 dark:text-forest-500">
        Day {seg.dayNumber} · This event was added by you and will be included in the export.
      </p>

      <button
        type="button"
        onClick={onRemove}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 transition-all cursor-pointer"
      >
        <Trash2 className="h-4 w-4" /> Remove event
      </button>
    </div>
  );
}

// ── Empty detail ──────────────────────────────────────────────────────────────

function EmptyDetail({ onAddEvent }: { onAddEvent: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-4">
      <div className="h-12 w-12 rounded-2xl bg-cream-200 dark:bg-forest-800 flex items-center justify-center">
        <MapPin className="h-6 w-6 text-forest-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-forest-700 dark:text-forest-300">Click any block to edit</p>
        <p className="text-xs text-forest-500 dark:text-forest-500 mt-1 leading-relaxed">
          Edit details, swap with AI alternatives, or remove events before exporting
        </p>
      </div>
      <button
        type="button"
        onClick={onAddEvent}
        className="flex items-center gap-1.5 rounded-xl border border-cream-300 dark:border-forest-700 px-4 py-2 text-sm font-medium text-forest-600 dark:text-forest-300 hover:bg-cream-100 dark:hover:bg-forest-800 transition-all cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Add an event
      </button>
      <p className="text-xs text-forest-400 dark:text-forest-600">
        Or click on empty space in a day column
      </p>
    </div>
  );
}

// ── Detail row helper ─────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-forest-400 flex-none mt-0.5" />
      <div className="min-w-0">
        <span className="text-xs text-forest-400 dark:text-forest-500">{label}: </span>
        <span className="text-xs text-forest-700 dark:text-forest-300">{children}</span>
      </div>
    </div>
  );
}
