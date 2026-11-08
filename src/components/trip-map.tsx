"use client";
// Trip tracking map (FR-22): full Leaflet map with the simulated car moving
// along the route polyline. Leaflet is loaded dynamically in the browser only;
// the car marker is a rotated divIcon so no marker asset files are needed.
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type TripMapProps = {
  path: { lat: number; lng: number }[];
  lat: number; // current simulated car position
  lng: number;
  bearingDeg: number;
  follow: boolean; // keep the map centered on the car while it moves
  carLabel: string;
  startName: string;
  endName: string;
};

export function TripMap({ path, lat, lng, bearingDeg, follow, carLabel, startName, endName }: TripMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const carRef = useRef<import("leaflet").Marker | null>(null);
  const followRef = useRef(follow);
  followRef.current = follow;

  // Initialize the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !boxRef.current || boxRef.current.dataset.ready === "1") return;
      boxRef.current.dataset.ready = "1";
      const map = L.map(boxRef.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      mapRef.current = map;

      const line = path.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(line, { color: "#0f766e", weight: 4, opacity: 0.75 }).addTo(map);
      L.circleMarker(line[0], { radius: 7, color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.9, weight: 2 }).addTo(map).bindTooltip(`Pickup · ${startName}`);
      L.circleMarker(line[line.length - 1], { radius: 7, color: "#b45309", fillColor: "#f59e0b", fillOpacity: 0.9, weight: 2 }).addTo(map).bindTooltip(`Return · ${endName}`);

      const icon = L.divIcon({
        className: "trip-car-icon",
        html: `<div class="trip-car-arrow" style="transform:rotate(${bearingDeg}deg)">🚗</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      carRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map).bindTooltip(carLabel);
      map.fitBounds(L.latLngBounds(line).pad(0.12), { maxZoom: 15 });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      carRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the car marker when the simulation advances.
  useEffect(() => {
    const map = mapRef.current;
    const car = carRef.current;
    if (!map || !car) return;
    car.setLatLng([lat, lng]);
    const arrow = car.getElement()?.querySelector<HTMLDivElement>(".trip-car-arrow");
    if (arrow) arrow.style.transform = `rotate(${bearingDeg}deg)`;
    if (followRef.current) map.panTo([lat, lng], { animate: true, duration: 0.4 });
  }, [lat, lng, bearingDeg]);

  return <div ref={boxRef} className="h-[360px] w-full overflow-hidden rounded-lg border bg-muted md:h-[440px]" role="img" aria-label={`Trip map showing ${carLabel} moving between ${startName} and ${endName}`} />;
}
