"use client";
// Simulated location map (FR-16): Leaflet circle marker, browser-only, with textual fallback.
// Leaflet's stylesheet is REQUIRED — without it the tile grid renders unstyled
// (grey box / scattered tiles). Kept local to this component so only pages
// that actually show a map pay the CSS cost.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

export function MapView({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!ref.current || ref.current.dataset.ready === "1") return;
      ref.current.dataset.ready = "1";
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      L.circleMarker([lat, lng], { radius: 9, color: "#059669", fillColor: "#10b981", fillOpacity: 0.85, weight: 2 })
        .addTo(map)
        .bindPopup(label);
      map.setView([lat, lng], 14);
    })();
    return () => { map?.remove(); };
  }, [lat, lng, label]);

  return (
    <div>
      <div ref={ref} className="h-56 w-full overflow-hidden rounded-lg border bg-muted" role="img" aria-label={`Sample location map: ${label}`} />
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" /> Approximate neighbourhood location (seeded sample, not live GPS).
      </p>
    </div>
  );
}
