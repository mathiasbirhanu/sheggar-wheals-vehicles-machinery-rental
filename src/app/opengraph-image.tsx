import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #022c22 0%, #064e3b 55%, #059669 100%)",
          padding: 64,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            🚗
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>{site.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Peer-to-peer car rental
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, color: "#a7f3d0" }}>
            for Addis Ababa — verified cars, escrow-held payments
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 26, color: "#d1fae5" }}>
          <div>{site.tagline}</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.14)", padding: "8px 20px", borderRadius: 999 }}>TeleBirr demo</div>
            <div style={{ background: "rgba(255,255,255,0.14)", padding: "8px 20px", borderRadius: 999 }}>FR-01..50</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
