import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { auth } from "@/lib/firebase";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Step = "phone" | "otp";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// The input only ever holds 10 local digits (see the phone field); +91 is
// the fixed country code and is added here, never typed by the user.
const normalisePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(-10);
  return `+91${digits}`;
};

// Short, human error text — never surface the raw "Firebase: Error (auth/…)".
const friendlyError = (err: unknown, fallback: string): string => {
  const code = (err as { code?: string })?.code ?? "";
  const messages: Record<string, string> = {
    "auth/invalid-phone-number": "That phone number doesn't look right.",
    "auth/missing-phone-number": "Enter your phone number.",
    "auth/too-many-requests": "Too many attempts — wait a moment and try again.",
    "auth/invalid-verification-code": "That code isn't correct.",
    "auth/code-expired": "That code expired — request a new one.",
    "auth/quota-exceeded": "SMS limit reached — try again later.",
    "auth/network-request-failed": "Network error — check your connection.",
  };
  return messages[code] || fallback;
};

export function LoginPage() {
  const navigate = useNavigate();
  const authState = useAdminAuth();
  const [step, setStep] = useState<Step>("phone");
  // No prefill and no placeholder, by design — the operator types their own
  // 10 local digits; +91 is the fixed prefix added by normalisePhone.
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const confirmRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  // Resend countdown while on the OTP step.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  if (authState.status === "admin") {
    return <Navigate to="/" replace />;
  }

  const sendOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const normalisedPhone = normalisePhone(phone);
      if (!verifierRef.current) throw new Error("reCAPTCHA verifier not ready");
      const confirmation = await signInWithPhoneNumber(
        auth,
        normalisedPhone,
        verifierRef.current
      );
      confirmRef.current = confirmation;
      setStep("otp");
      setOtp("");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      console.error("[LoginPage] sendOtp failed", err);
      setError(friendlyError(err, "Couldn't send the code. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = (event: React.FormEvent) => {
    event.preventDefault();
    void sendOtp();
  };

  const verifyOtp = async (code: string) => {
    setError(null);
    setBusy(true);
    try {
      if (!confirmRef.current) throw new Error("Send OTP first");
      await confirmRef.current.confirm(code);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[LoginPage] verifyOtp failed", err);
      setError(friendlyError(err, "That code isn't right. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = (event: React.FormEvent) => {
    event.preventDefault();
    void verifyOtp(otp);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Quiet ambiance — a radial indigo wash + faint grid, masked to the top
          half, so the card is the only object and the page isn't a void. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.07),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)] bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:24px_24px]"
      />

      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Brand */}
          <div className="mb-9 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-elevated ring-1 ring-black/[0.02] dark:ring-white/5">
              <img
                src="/logo.svg"
                alt="CharzPe"
                className="h-9 w-9 object-contain dark:invert dark:hue-rotate-180"
              />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              CharzPe
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Sign in to the admin console
            </p>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            {step === "phone" && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-overline uppercase text-muted-foreground"
                  >
                    Phone number
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-muted-foreground">
                      +91
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      className="focus-ring block w-full rounded-lg border border-input bg-background pl-12 pr-3.5 py-2.5 text-sm transition-colors hover:border-input/80"
                      required
                      autoComplete="tel"
                      autoFocus
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={busy}
                  disabled={phone.length !== 10}
                  className="w-full"
                >
                  {busy ? "Sending code…" : "Continue"}
                  {!busy && <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-overline uppercase text-muted-foreground">
                    One-time code
                  </label>
                  <p className="mb-3 text-[13px] text-muted-foreground">
                    Code sent to{" "}
                    <span className="font-medium text-foreground">
                      {normalisePhone(phone)}
                    </span>
                  </p>
                  <OtpInput
                    length={OTP_LENGTH}
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => void verifyOtp(code)}
                    disabled={busy}
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={busy}
                  disabled={otp.length < OTP_LENGTH}
                  className="w-full"
                >
                  {busy ? "Verifying…" : "Verify & sign in"}
                  {!busy && <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError(null);
                    }}
                    className="focus-ring inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change number
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendOtp()}
                    disabled={resendIn > 0 || busy}
                    className="focus-ring rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendIn > 0 ? (
                      <span className="tabular-nums">Resend in {resendIn}s</span>
                    ) : (
                      "Resend code"
                    )}
                  </button>
                </div>
              </form>
            )}

            {error && (
              <Alert tone="danger" className="mt-5">
                {error}
              </Alert>
            )}

            <div id="recaptcha-container" />
          </div>
        </div>
      </div>
    </div>
  );
}
