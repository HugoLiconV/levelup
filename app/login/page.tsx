"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Icon } from "../components/Icons";
import { Button, Field, IconButton } from "../components/ui";
import { createClient } from "../lib/supabase/client";

type PendingAction = "password" | "google" | null;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.2a10 10 0 0 0 0 9.2L6.5 14Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.5l3.3 2.6a5.8 5.8 0 0 1 5.5-4Z" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
      {!visible && <path d="m4 4 16 16" />}
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissedCallbackError, setDismissedCallbackError] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const callbackError = searchParams.get("error") === "oauth" && !dismissedCallbackError
    ? "No pudimos iniciar sesión con Google. Inténtalo de nuevo."
    : null;
  const displayedError = error ?? callbackError;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;

    if (!emailInput.validity.valid) {
      setEmailError(emailInput.validity.valueMissing ? "Ingresa tu correo." : "Correo no válido.");
      emailInput.focus();
      return;
    }
    if (!password) {
      setPasswordError("Ingresa tu contraseña.");
      return;
    }

    setPendingAction("password");
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setDismissedCallbackError(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setPendingAction(null);
    }
  };

  const signInWithGoogle = async () => {
    setPendingAction("google");
    setError(null);
    setDismissedCallbackError(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signInError) {
        setError("No pudimos iniciar sesión con Google. Inténtalo de nuevo.");
        setPendingAction(null);
      }
    } catch {
      setError("No pudimos conectarnos con Google. Revisa tu conexión e inténtalo de nuevo.");
      setPendingAction(null);
    }
  };

  const busy = pendingAction !== null;

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-lockup">
          <span className="brand-mark"><Icon name="sparkles" size={18} /></span>
          <span id="login-title">levelup</span>
        </div>
        <p className="login-subtitle">Inicia sesión para continuar tu checkpoint.</p>
        <form className="login-form" onSubmit={submit} noValidate>
          <Field
            label="Correo"
            htmlFor="login-email"
            error={emailError}
            errorId="login-email-error"
          >
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "login-email-error" : undefined}
              onBlur={(event) => {
                if (event.currentTarget.value && !event.currentTarget.validity.valid) setEmailError("Correo no válido.");
              }}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError(null);
                if (error) setError(null);
                setDismissedCallbackError(true);
              }}
            />
          </Field>
          <Field
            label="Contraseña"
            htmlFor="login-password"
            error={passwordError}
            errorId="login-password-error"
          >
            <div className="password-input">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "login-password-error" : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) setPasswordError(null);
                  if (error) setError(null);
                  setDismissedCallbackError(true);
                }}
              />
              <IconButton
                className="password-toggle"
                label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <EyeIcon visible={showPassword} />
              </IconButton>
            </div>
          </Field>
          {displayedError && <p className="login-error" role="alert">{displayedError}</p>}
          <Button variant="primary" type="submit" disabled={busy}>
            {pendingAction === "password" ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <div className="login-divider" aria-hidden="true"><span>O CONTINÚA CON</span></div>
        <button type="button" className="google-button" disabled={busy} onClick={signInWithGoogle}>
          <GoogleIcon />
          <span>{pendingAction === "google" ? "Conectando…" : "Google"}</span>
        </button>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="login-screen" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}
