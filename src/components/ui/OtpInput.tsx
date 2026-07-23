import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Segmented numeric OTP entry: one box per digit, auto-advance on input,
 * backspace steps back, paste splits across boxes, and onComplete fires when
 * every box is filled.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [revealed, setRevealed] = useState(false);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const commit = (next: string) => {
    const cleaned = next.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length) onComplete?.(cleaned);
  };

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    refs.current[clamped]?.focus();
    refs.current[clamped]?.select();
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const chars = value.split("");
    chars[index] = char;
    const next = chars.join("").slice(0, length);
    commit(next);
    focusBox(index + 1);
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.split("");
      if (chars[index]) {
        chars[index] = "";
        commit(chars.join(""));
      } else {
        focusBox(index - 1);
        const prev = value.split("");
        prev[index - 1] = "";
        commit(prev.join(""));
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    commit(pasted);
    focusBox(Math.min(pasted.replace(/\D/g, "").length, length - 1));
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 justify-between gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.currentTarget.select()}
          // Mask the entered digit as a dot (shoulder-surfing protection) unless
          // revealed; numeric input + OTP autofill are unaffected either way.
          style={
            revealed
              ? undefined
              : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)
          }
          className={cn(
            "nums h-12 w-full rounded-lg border bg-background text-center text-xl font-semibold text-foreground transition-colors",
            "focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-ring/15",
            "disabled:opacity-60",
            digit ? "border-primary/40" : "border-input"
          )}
        />
      ))}
      </div>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? "Hide code" : "Show code"}
        tabIndex={-1}
        className="focus-ring flex h-12 w-9 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:border-input/80 hover:text-foreground"
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
