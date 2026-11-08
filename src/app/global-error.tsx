"use client";
// Root error boundary: last-resort full-document fallback when the layout itself fails.
// Must render its own <html>/<body> because the root layout is bypassed here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fafaf9",
          color: "#1c1917",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚗</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Sheggar Wheels hit a snag</h1>
          <p style={{ fontSize: 14, color: "#78716c", margin: "0 0 20px" }}>
            A critical error occurred. Please reload the app. If the problem persists,
            the incident has been logged {error.digest ? `(ref: ${error.digest})` : ""}.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#059669",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload Sheggar Wheels
          </button>
        </div>
      </body>
    </html>
  );
}
