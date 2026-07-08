import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { CardOption, ChoiceMade } from "../api";

// ── Marker factories ──────────────────────────────────────────────────────────

function divIcon(html: string, size: number): L.DivIcon {
  return L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// Gold circle with day number — for locked-in stops
function chosenMarker(dayNum: number): L.DivIcon {
  return divIcon(
    `<div style="
      width:26px;height:26px;border-radius:50%;
      background:linear-gradient(145deg,#e6b82a,#c89a14);
      border:2px solid rgba(255,255,255,0.9);
      box-shadow:0 2px 12px rgba(212,160,23,0.55),0 0 0 3px rgba(212,160,23,0.18);
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:700;color:#1a1000;font-family:Georgia,serif;
      line-height:1;
    ">${dayNum}</div>`,
    26,
  );
}

// First stop — slightly different style
const startMarker = divIcon(
  `<div style="
    width:22px;height:22px;border-radius:50%;
    background:linear-gradient(145deg,#f0e4a8,#d4a017);
    border:2px solid rgba(255,255,255,0.95);
    box-shadow:0 2px 10px rgba(212,160,23,0.45),0 0 0 4px rgba(212,160,23,0.12);
  "></div>`,
  22,
);

// Option dots — minimal, glowing. Active = larger + brighter.
function optionMarker(active: boolean): L.DivIcon {
  if (active) {
    return divIcon(
      `<div style="
        width:20px;height:20px;border-radius:50%;
        background:radial-gradient(circle at 38% 38%,#f5d76e,#c89a14);
        border:2px solid rgba(255,255,255,0.95);
        box-shadow:0 0 0 4px rgba(212,160,23,0.25),0 2px 10px rgba(212,160,23,0.5);
      "></div>`,
      20,
    );
  }
  return divIcon(
    `<div style="
      width:11px;height:11px;border-radius:50%;
      background:rgba(240,228,168,0.55);
      border:1.5px solid rgba(255,255,255,0.45);
      box-shadow:0 1px 6px rgba(212,160,23,0.25);
    "></div>`,
    11,
  );
}

// Pending map pin — dashed ring, signals "click to confirm"
const pendingPinMarker = divIcon(
  `<div style="
    width:28px;height:28px;border-radius:50%;
    background:rgba(255,255,255,0.06);
    border:2px dashed rgba(255,255,255,0.55);
    box-shadow:0 0 0 5px rgba(255,255,255,0.05);
    display:flex;align-items:center;justify-content:center;
    color:rgba(255,255,255,0.65);font-size:15px;line-height:1;
  ">+</div>`,
  28,
);

// ── Auto-fit bounds ───────────────────────────────────────────────────────────

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const prev = useRef("");

  useEffect(() => {
    const key = JSON.stringify(positions);
    if (key === prev.current || positions.length === 0) return;
    prev.current = key;
    if (positions.length === 1) {
      map.setView(positions[0], 9, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 9, animate: true });
    }
  }, [positions, map]);

  return null;
}

// ── Map click handler ─────────────────────────────────────────────────────────

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

type TripMapProps = {
  choices: ChoiceMade[];
  currentOptions: CardOption[];
  hoveredOptionId: string | null;
  selectedOptionId: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  pendingPoint?: { lat: number; lng: number } | null;
};

export default function TripMap({
  choices, currentOptions, hoveredOptionId, selectedOptionId,
  onMapClick, pendingPoint,
}: TripMapProps) {
  const chosenPositions: [number, number][] = choices
    .filter((c) => c.lat !== 0 || c.lng !== 0)
    .map((c) => [c.lat, c.lng]);

  const validOptions = currentOptions.filter((o) => o.lat !== 0 || o.lng !== 0);
  const activeId = selectedOptionId ?? hoveredOptionId;

  const allPositions: [number, number][] = [
    ...chosenPositions,
    ...validOptions.map((o): [number, number] => [o.lat, o.lng]),
    ...(pendingPoint ? [[pendingPoint.lat, pendingPoint.lng] as [number, number]] : []),
  ];

  const lastChosen = chosenPositions[chosenPositions.length - 1];

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
      style={{ background: "#0c1510" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      <FitBounds positions={allPositions.length > 0 ? allPositions : [[20, 0]]} />
      {onMapClick && <MapClickHandler onClick={onMapClick} />}

      {/* Chosen route line */}
      {chosenPositions.length > 1 && (
        <Polyline
          positions={chosenPositions}
          pathOptions={{ color: "#d4a017", weight: 2, dashArray: "7 5", opacity: 0.85 }}
        />
      )}

      {/* Fan lines from last stop to each option — all faint */}
      {lastChosen && validOptions.map((opt) => (
        <Polyline
          key={`fan-${opt.id}`}
          positions={[lastChosen, [opt.lat, opt.lng]]}
          pathOptions={{
            color: "#d4a017",
            weight: opt.id === activeId ? 1.5 : 1,
            dashArray: "3 7",
            opacity: opt.id === activeId ? 0.45 : 0.18,
          }}
        />
      ))}

      {/* Chosen stop markers */}
      {chosenPositions.map((pos, i) => (
        <Marker
          key={`chosen-${i}`}
          position={pos}
          icon={i === 0 ? startMarker : chosenMarker(i + 1)}
        />
      ))}

      {/* Option markers — active one is bigger and brighter */}
      {validOptions.map((opt) => (
        <Marker
          key={`opt-${opt.id}`}
          position={[opt.lat, opt.lng]}
          icon={optionMarker(opt.id === activeId)}
        />
      ))}

      {/* Pending pin from map click */}
      {pendingPoint && (
        <Marker
          position={[pendingPoint.lat, pendingPoint.lng]}
          icon={pendingPinMarker}
        />
      )}
    </MapContainer>
  );
}
