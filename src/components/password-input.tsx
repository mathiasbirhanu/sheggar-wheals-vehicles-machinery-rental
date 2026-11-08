"use client";
// Password field with a show/hide toggle. Shared by sign-in and sign-up so
// both flows behave identically (autoComplete differs per flow).
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordInputProps = {
  id?: string;
  label?: string;
  hint?: string;
  autoComplete?: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export function PasswordInput({
  id,
  label,
  hint,
  autoComplete = "current-password",
  value,
  onChange,
  placeholder,
  required,
}: PasswordInputProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div className="relative">
        <Input
          id={inputId}
          name={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          minLength={autoComplete === "new-password" ? 8 : undefined}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
