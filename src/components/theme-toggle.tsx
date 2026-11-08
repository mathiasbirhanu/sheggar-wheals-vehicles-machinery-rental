"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};
// SSR-safe "mounted" flag without setState-in-effect (React compiler friendly).
const mounted = { subscribe: emptySubscribe, client: () => true, server: () => false };

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useSyncExternalStore(mounted.subscribe, mounted.client, mounted.server);
  if (!isClient) return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
