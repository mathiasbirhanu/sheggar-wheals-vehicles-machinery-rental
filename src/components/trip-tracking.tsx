"use client";
// Trip tracking section (FR-22): a simulated GPS playback for the booking window.
// A virtual clock advances through the real rental period at a selectable speed;
// the car's position is interpolated along a fixed sample route (BR-12: demo only).
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Route, MapPin, Play, Pause, RotateCcw, TriangleAlert } from "lucide-react";
import { pickRoute, positionAt } from "@/lib/trips";
import { TripMap } from "@/components/trip-map";

const SPEEDS = [1, 60, 300] as const;
const TICK_MS = 500;

export function TripTracking({ carLabel, carLat, carLng, startIso, endIso, status }: { carLabel: string; carLat: number; carLng: number; startIso: string; endIso: string; status: string }) {
  const route = useMemo(() => pickRoute(carLat, carLng), [carLat, carLng]);
  const startMs = useMemo(() => new Date(startIso).getTime(), [startIso]);
  const endMs = useMemo(() => new Date(endIso).getTime(), [endIso]);
  const durationMs = Math.max(1, endMs - startMs);

  const isTripOver = status !== "IN_PROGRESS";
  // First paint (server AND first client render) derives from props only — a
  // Date.now() initialiser would hydrate with a different width and warn.
  const [virtualMs, setVirtualMs] = useState(() => (isTripOver ? durationMs : 0));
  const [speed, setSpeed] = useState<number>(60);
  const [playing, setPlaying] = useState(!isTripOver);
  const [follow, setFollow] = useState(true);
  const lastTickRef = useRef<number>(0);

  // After hydration, anchor the demo clock to the real booking window.
  useEffect(() => {
    if (isTripOver) return;
    setVirtualMs(Math.min(durationMs, Math.max(0, Date.now() - startMs)));
    setPlaying(true);
  }, [isTripOver, durationMs, startMs]);

  useEffect(() => {
    if (!playing) return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      setVirtualMs((v) => {
        const next = v + dt * speed;
        if (next >= durationMs) {
          setPlaying(false);
          return durationMs;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, speed, durationMs]);

  const progress = Math.min(1, virtualMs / durationMs);
  const pos = useMemo(() => positionAt(route, progress), [route, progress]);
  const etaMs = durationMs - virtualMs;
  const etaLabel = etaMs <= 0 ? "arrived" : etaMs >= 86400000 ? `${Math.round(etaMs / 86400000)} d remaining` : `${Math.round(etaMs / 3600000)} h remaining`;
  // Deterministic Africa/Addis_Ababa (UTC+3, no DST) clock — identical string on
  // server and client, unlike locale-sensitive toLocaleString.
  const ADDIS_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const addis = new Date(startMs + virtualMs + 3 * 3600000);
  const clockLabel = `${String(addis.getUTCDate()).padStart(2, "0")} ${ADDIS_MONTHS[addis.getUTCMonth()]}, ${String(addis.getUTCHours()).padStart(2, "0")}:${String(addis.getUTCMinutes()).padStart(2, "0")}`;

  const restart = () => {
    setVirtualMs(0);
    setPlaying(true);
  };

  return (
    <Card className="border-sky-200 dark:border-sky-900">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Route className="h-4 w-4" aria-hidden /> Trip tracking
          <Badge variant="secondary" className="text-[10px]">simulation</Badge>
          <span className="text-xs font-normal text-muted-foreground">{route.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" role="note">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Simulated GPS — the car follows a sample Addis Ababa route on a demo clock. No live tracking is used (FR-22, BR-12).</span>
        </div>

        <TripMap
          path={route.points.map((p) => ({ lat: p.lat, lng: p.lng }))}
          lat={pos.lat}
          lng={pos.lng}
          bearingDeg={pos.bearingDeg}
          follow={follow}
          carLabel={`${carLabel} · simulated position`}
          startName={route.points[0].name}
          endName={route.points[route.points.length - 1].name}
        />

        {/* Progress + live HUD */}
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-sky-500 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
            <p><span className="font-semibold text-foreground">{Math.round(progress * 100)}%</span> of route</p>
            <p><MapPin className="mr-1 inline h-3 w-3" aria-hidden />Near <span className="font-medium text-foreground">{pos.area}</span></p>
            <p>Demo clock: <span className="font-medium text-foreground">{clockLabel}</span></p>
            <p>{etaLabel} · {(route.lengthM / 1000).toFixed(1)} km total</p>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex flex-wrap items-center gap-2" aria-label="Simulation playback controls">
          <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
            {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button size="sm" variant="ghost" onClick={restart}><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Replay trip</Button>
          <div className="flex items-center gap-1" role="group" aria-label="Simulation speed">
            {SPEEDS.map((s) => (
              <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setSpeed(s)} aria-pressed={speed === s}>
                {s}×
              </Button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="accent-sky-600" /> Follow car
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
