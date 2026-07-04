import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { CardOption, ChoiceMade } from "../api";

// ── Custom div icons ──────────────────────────────────────────────────────────

function makeIcon(html: string, size: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const CHOSEN_ICON = makeIcon(
  `<div style="width:14px;height:14px;border-radius:50%;background:#d4a017;border:2.5px solid #fff;box-shadow:0 0 10px rgba(212,160,23,0.7)"></div>`,
  14,
);

const START_ICON = makeIcon(
  `<div style="width:12px;height:12px;border-radius:50%;background:#f0e68c;border:2px solid #fff;box-shadow:0 0 8px rgba(240,230,140,0.8)"></div>`,
  12,
);

const OPTION_COLORS = ["#60a5fa", "#fb923c", "#4ade80"]; // A=blue, B=amber, C=green

function optionIcon(colorHex: string, letter: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${colorHex};border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:sans-serif;">${letter}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ── Auto-fit bounds ───────────────────────────────────────────────────────────

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const prev = useRef<string>("");

  useEffect(() => {
    const key = JSON.stringify(positions);
    if (key === prev.current || positions.length === 0) return;
    prev.current = key;

    if (positions.length === 1) {
      map.setView(positions[0], 9, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [56, 56], maxZoom: 9, animate: true });
    }
  }, [positions, map]);

  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

type TripMapProps = {
  choices: ChoiceMade[];
  currentOptions: CardOption[];
  hoveredOptionId: string | null;
  selectedOptionId: string | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripMap({ choices, currentOptions, hoveredOptionId, selectedOptionId }: TripMapProps) {
  // All chosen positions (lat/lng pairs that are non-zero)
  const chosenPositions: [number, number][] = choices
    .filter((c) => c.lat !== 0 || c.lng !== 0)
    .map((c) => [c.lat, c.lng]);

  // Current options with coordinates
  const validOptions = currentOptions.filter((o) => o.lat !== 0 || o.lng !== 0);

  // All positions for auto-fit: chosen + current options
  const allPositions: [number, number][] = [
    ...chosenPositions,
    ...validOptions.map((o): [number, number] => [o.lat, o.lng]),
  ];

  // Route line including a preview line to the active/hovered option
  const activeId = selectedOptionId ?? hoveredOptionId;
  const activeOption = validOptions.find((o) => o.id === activeId) ?? validOptions[0];
  const previewLine: [number, number][] =
    chosenPositions.length > 0 && activeOption
      ? [chosenPositions[chosenPositions.length - 1], [activeOption.lat, activeOption.lng]]
      : [];

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
      style={{ background: "#0f1a14" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      <FitBounds positions={allPositions.length > 0 ? allPositions : [[20, 0]]} />

      {/* Chosen route — solid gold dashed line */}
      {chosenPositions.length > 1 && (
        <Polyline
          positions={chosenPositions}
          pathOptions={{ color: "#d4a017", weight: 2.5, dashArray: "8 5", opacity: 0.9 }}
        />
      )}

      {/* Preview line to active option — faded */}
      {previewLine.length === 2 && (
        <Polyline
          positions={previewLine}
          pathOptions={{ color: "#d4a017", weight: 1.5, dashArray: "4 6", opacity: 0.4 }}
        />
      )}

      {/* Chosen stop markers */}
      {chosenPositions.map((pos, i) => (
        <Marker key={`chosen-${i}`} position={pos} icon={i === 0 ? START_ICON : CHOSEN_ICON} />
      ))}

      {/* Current option markers */}
      {validOptions.map((opt, i) => {
        const isActive = opt.id === (selectedOptionId ?? hoveredOptionId);
        const color = OPTION_COLORS[i] ?? OPTION_COLORS[0];
        const letter = opt.id.toUpperCase();
        const icon = optionIcon(color, letter);

        return (
          <Marker
            key={`opt-${opt.id}`}
            position={[opt.lat, opt.lng]}
            icon={icon}
            opacity={isActive ? 1 : 0.55}
          />
        );
      })}
    </MapContainer>
  );
}
