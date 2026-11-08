// Simulated trip routing (FR-22): deterministic Addis Ababa sample routes.
// No live GPS (BR-12) — the car's position is interpolated along a fixed
// polyline so the tracking map demonstrates how live tracking would work.

export type TripPoint = { lat: number; lng: number; name: string };

export type TripRoute = {
  name: string;
  points: TripPoint[]; // first === last: every rental returns to the pickup point
  lengthM: number;
};

type Raw = [number, number, string]; // lat, lng, name

const raw: { name: string; pts: Raw[] }[] = [
  {
    name: "Bole – Airport – Gotera circuit",
    pts: [
      [8.9936, 38.7871, "Bole"],
      [8.988, 38.795, "Bole Michael"],
      [8.9779, 38.7993, "Bole International Airport"],
      [8.9855, 38.789, "Gotera"],
      [8.9893, 38.7816, "Bole Rwanda"],
      [8.9936, 38.7871, "Bole"],
    ],
  },
  {
    name: "Kazanchis – Meskel Square – Old Airport circuit",
    pts: [
      [9.0156, 38.7608, "Kazanchis"],
      [9.0107, 38.7613, "Meskel Square"],
      [9.004, 38.7635, "Mexico"],
      [8.9867, 38.7997, "Old Airport"],
      [8.9936, 38.7871, "Bole"],
      [9.0156, 38.7608, "Kazanchis"],
    ],
  },
  {
    name: "Megenagna – CMC – Arat Kilo circuit",
    pts: [
      [9.0186, 38.8026, "Megenagna"],
      [9.0269, 38.8305, "CMC"],
      [9.0068, 38.8117, "Gerji"],
      [9.035, 38.7636, "Arat Kilo"],
      [9.0186, 38.8026, "Megenagna"],
    ],
  },
];

const toRad = (d: number) => (d * Math.PI) / 180;

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function build(name: string, pts: Raw[]): TripRoute {
  const points = pts.map(([lat, lng, name]) => ({ lat, lng, name }));
  let lengthM = 0;
  for (let i = 1; i < points.length; i++) lengthM += haversineM(points[i - 1], points[i]);
  return { name, points, lengthM };
}

const ROUTES: TripRoute[] = raw.map((r) => build(r.name, r.pts));

/** Deterministic pick: the route whose start is nearest the car's home coordinates. */
export function pickRoute(carLat: number, carLng: number): TripRoute {
  let best = ROUTES[0];
  let bestD = Infinity;
  for (const r of ROUTES) {
    const d = haversineM({ lat: carLat, lng: carLng }, r.points[0]);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export type TripPosition = {
  lat: number;
  lng: number;
  bearingDeg: number; // car heading on the current leg
  area: string; // most recently passed waypoint ("Near: …")
};

/** Position of the car at progress t ∈ [0,1] along the route polyline. */
export function positionAt(route: TripRoute, t: number): TripPosition {
  const p = Math.min(1, Math.max(0, t));
  const target = route.lengthM * p;
  let acc = 0;
  const pts = route.points;
  for (let i = 1; i < pts.length; i++) {
    const segLen = haversineM(pts[i - 1], pts[i]);
    if (acc + segLen >= target || i === pts.length - 1) {
      const f = segLen === 0 ? 0 : (target - acc) / segLen;
      const lat = pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * f;
      const lng = pts[i - 1].lng + (pts[i].lng - pts[i - 1].lng) * f;
      const bearingDeg =
        (Math.atan2(
          Math.sin(toRad(pts[i].lng - pts[i - 1].lng)) * Math.cos(toRad(pts[i].lat)),
          Math.cos(toRad(pts[i - 1].lat)) * Math.sin(toRad(pts[i].lat)) -
            Math.sin(toRad(pts[i - 1].lat)) * Math.cos(toRad(pts[i].lat)) * Math.cos(toRad(pts[i].lng - pts[i - 1].lng))
        ) *
          180) /
          Math.PI;
      return { lat, lng, bearingDeg: (bearingDeg + 360) % 360, area: pts[i - 1].name };
    }
    acc += segLen;
  }
  const last = pts[pts.length - 1];
  return { lat: last.lat, lng: last.lng, bearingDeg: 0, area: last.name };
}
