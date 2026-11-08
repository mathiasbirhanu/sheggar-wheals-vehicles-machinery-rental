"use client";
// FR-08 map search: available cars plotted as price pins on a Leaflet map.
// Leaflet only loads when the renter opens the "Map" tab, so the default
// list view keeps its zero-extra-JS, server-rendered performance.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { List, Map as MapIcon, MapPin } from "lucide-react";

export type MapCar = {
  id: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  neighbourhood: string;
  lat: number;
  lng: number;
  photo: string | null;
};

const BRAND = "#059669";

export function CarsMap({ cars, listSlot }: { cars: MapCar[]; listSlot: ReactNode }) {
  const [view, setView] = useState<"list" | "map">("list");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const builtRef = useRef(false);

  // Build the Leaflet map the first time the renter switches to "Map".
  useEffect(() => {
    if (view !== "map" || builtRef.current || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || builtRef.current) return;
      builtRef.current = true;
      const map = L.map(containerRef.current, { scrollWheelZoom: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const pins: import("leaflet").Marker[] = [];
      for (const c of cars) {
        const pin = L.marker([c.lat, c.lng], {
          icon: L.divIcon({
            className: "cw-pin",
            html:
              `<span style="display:inline-flex;align-items:center;height:24px;padding:0 10px;background:${BRAND};color:#fff;font-size:12px;font-weight:600;line-height:1;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap">${c.pricePerDay.toLocaleString("en-US")}</span>` +
              `<i style="display:block;width:0;height:0;margin:0 auto;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${BRAND}"></i>`,
            iconSize: [72, 32],
            iconAnchor: [36, 32],
            popupAnchor: [0, -34],
          }),
        }).addTo(map);
        pin.bindPopup(buildPopup(c));
        pins.push(pin);
      }

      if (pins.length) {
        map.fitBounds(L.featureGroup(pins).getBounds().pad(0.3), { maxZoom: 14 });
      } else {
        map.setView([9.03, 38.74], 11); // Addis Ababa fallback when nothing matches
      }
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    })();
    return () => {
      cancelled = true;
    };
  }, [view, cars]);

  // Leaflet needs a nudge whenever its hidden container becomes visible.
  useEffect(() => {
    if (view === "map") {
      const t = setTimeout(() => mapRef.current?.invalidateSize(), 80);
      return () => clearTimeout(t);
    }
  }, [view]);

  // No results -> no tabs, just the empty state from the server.
  if (cars.length === 0) return <>{listSlot}</>;

  return (
    <div className="space-y-3">
      <style>{`.cw-pin:hover span{transform:scale(1.12);cursor:pointer}`}</style>
      <div className="inline-flex rounded-lg border p-1" role="tablist" aria-label="Result view">
        <button
          role="tab"
          aria-selected={view === "list"}
          onClick={() => setView("list")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "list" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-4 w-4" /> List
        </button>
        <button
          role="tab"
          aria-selected={view === "map"}
          onClick={() => setView("map")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "map" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapIcon className="h-4 w-4" /> Map ({cars.length})
        </button>
      </div>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        Pins show the ETB/day price at each car&apos;s neighbourhood — click a pin, then “View details”.
      </p>

      {/* Map panel: stays mounted once built, only visually hidden */}
      <div hidden={view !== "map"}>
        <div ref={containerRef} className="relative z-0 h-[460px] w-full overflow-hidden rounded-xl border bg-muted" />
      </div>

      {/* List panel: server-rendered grid + pagination, hidden while in map view */}
      <div hidden={view === "map"}>{listSlot}</div>
    </div>
  );
}

// Popup is assembled with textContent only — owner-entered data can never inject HTML (XSS-safe).
function buildPopup(c: MapCar): HTMLElement {
  const el = document.createElement("div");
  el.style.width = "190px";

  if (c.photo) {
    const img = document.createElement("img");
    img.src = c.photo;
    img.alt = `${c.make} ${c.model}`;
    img.loading = "lazy";
    img.style.cssText = "width:100%;height:84px;object-fit:cover;border-radius:8px;margin-bottom:8px";
    el.appendChild(img);
  }

  const title = document.createElement("p");
  title.style.cssText = "margin:0;font-weight:600;font-size:14px;color:#111";
  title.textContent = `${c.make} ${c.model} ${c.year}`;
  el.appendChild(title);

  const sub = document.createElement("p");
  sub.style.cssText = "margin:2px 0 0;font-size:12px;color:#666";
  sub.textContent = `${c.neighbourhood}, Addis Ababa`;
  el.appendChild(sub);

  const price = document.createElement("p");
  price.style.cssText = `margin:4px 0 0;font-size:13px;font-weight:600;color:${BRAND}`;
  price.textContent = `${c.pricePerDay.toLocaleString("en-US")} ETB/day`;
  el.appendChild(price);

  const link = document.createElement("a");
  link.href = `/cars/${c.id}`;
  link.style.cssText = `display:inline-block;margin-top:8px;padding:5px 12px;background:${BRAND};color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none`;
  link.textContent = "View details →";
  el.appendChild(link);

  return el;
}
