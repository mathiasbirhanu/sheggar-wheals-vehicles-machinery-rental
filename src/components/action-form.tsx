"use client";
// Generic server-action form wrapper: renders error/success feedback via toast (BR-12 honest feedback).
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/validation";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className, id, onSuccess }: { action: Action; children: React.ReactNode; className?: string; id?: string; onSuccess?: (state: ActionState) => void }) {
  const [state, formAction] = useActionState(action, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok && state.message) toast.success(state.message);
    if (state.ok || state.error) onSuccess?.(state);
  }, [state]);
  return (
    <form action={formAction} className={className} id={id}>
      {children}
    </form>
  );
}
