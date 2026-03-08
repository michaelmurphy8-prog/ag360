"use client";
// app/mobile/login/page.tsx
// Login screen — Clerk useSignIn, custom dark UI

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function MobileLogin() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!isLoaded || loading) return;
    setError("");
    setLoading(true);

    try {
      // Step 1: identify the user
      const attempt = await signIn.create({
        identifier: email.trim(),
      });

      // Step 2: attempt password factor
      const result = await attempt.attemptFirstFactor({
        strategy: "password",
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/mobile/pillars");
      } else {
        setError(`Sign in incomplete. Status: ${result.status}`);
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Invalid email or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card {
          animation: fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        .login-input {
          background: #0D1726;
          border: 1px solid #1A2940;
          border-radius: 12px;
          color: #F0F4F8;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          padding: 16px 18px;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          -webkit-appearance: none;
        }
        .login-input::placeholder { color: #2A3F5A; }
        .login-input:focus { border-color: #C8A84B; }
        .login-btn {
          background: #C8A84B;
          color: #070D18;
          border: none;
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 18px;
          width: 100%;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .login-btn:active { transform: scale(0.98); opacity: 0.9; }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#070D18",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "38px",
            letterSpacing: "0.02em",
            color: "#F0F4F8",
            marginBottom: "40px",
            userSelect: "none",
          }}
        >
          AG
          <span style={{ color: "#C8A84B" }}>/</span>
          360
        </div>

        {/* Card */}
        <div
          className="login-card"
          style={{
            width: "100%",
            maxWidth: "380px",
            background: "#0D1726",
            border: "1px solid #1A2940",
            borderRadius: "20px",
            padding: "32px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "22px",
                color: "#F0F4F8",
                marginBottom: "4px",
              }}
            >
              Welcome back
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#4A6A8A",
              }}
            >
              Sign in to your farm account
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              className="login-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            />
          </div>

          {error && (
            <div
              style={{
                background: "rgba(220, 60, 60, 0.12)",
                border: "1px solid rgba(220, 60, 60, 0.3)",
                borderRadius: "10px",
                padding: "12px 14px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "#F08080",
              }}
            >
              {error}
            </div>
          )}

          <button
            className="login-btn"
            onClick={handleSignIn}
            disabled={loading || !email || !password}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#1E3050",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          AG360 Technologies Inc.
        </div>
      </div>
    </>
  );
}