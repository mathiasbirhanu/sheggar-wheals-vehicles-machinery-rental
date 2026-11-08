"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injects an invisible inline <script> that applies the saved theme
// BEFORE hydration (prevents the light/dark "flash" on load). React 19.2 — the
// React inside Next.js 16.2+ — logs a dev-console error for any <script> rendered
// inside a component ("Encountered a script tag while rendering React component").
// This is a documented FALSE POSITIVE: the script executes correctly from the
// server HTML, and theme toggling works. next-themes is no longer updated, so the
// shadcn/ui dark-mode guide's official fix is to filter exactly that one warning,
// in development only, leaving every other console error untouched.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("Encountered a script tag")) return;
    originalConsoleError(...args);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>{children}</NextThemesProvider>;
}
