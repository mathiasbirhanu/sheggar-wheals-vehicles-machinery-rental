"use client";
// Submit button with pending state (NFR: visible loading feedback).
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, variant, size, className, disabled }: ComponentProps<typeof Button> & { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending || disabled}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
