// src/PasswordGate.tsx
import React, { useState } from "react";

const PASSWORD = import.meta.env.VITE_FACELYTICS_PASSWORD;

interface PasswordGateProps {
  children: React.ReactNode;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    // allow "remember me" in this browser via localStorage
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("facelytics_authed") === "1";
  });
  const [error, setError] = useState("");

  if (unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      setUnlocked(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("facelytics_authed", "1");
      }
    } else {
      setError("Incorrect password.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #111827, #020817)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        boxSizing: "border-box",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "1.6rem 1.8rem",
          borderRadius: "1.1rem",
          border: "1px solid rgba(75,85,99,0.9)",
          background: "rgba(9,9,11,0.98)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            fontSize: "0.78rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: "0.35rem",
          }}
        >
          Facelytics
        </div>
        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 600,
            marginBottom: "0.4rem",
          }}
        >
          Team access
        </h1>
        <p
          style={{
            fontSize: "0.86rem",
            color: "#9ca3af",
            marginBottom: "0.9rem",
          }}
        >
          This dashboard is restricted to roster members. Enter the shared
          Facelytics password to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            placeholder="Password"
            autoFocus
            style={{
              width: "100%",
              padding: "0.55rem 0.7rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(75,85,99,0.9)",
              background: "#020817",
              color: "#e5e7eb",
              fontSize: "0.86rem",
              marginBottom: "0.55rem",
              outline: "none",
            }}
          />
          {error && (
            <div
              style={{
                color: "#f97316",
                fontSize: "0.78rem",
                marginBottom: "0.4rem",
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.55rem 0.7rem",
              borderRadius: "999px",
              border: "none",
              fontSize: "0.86rem",
              fontWeight: 600,
              cursor: "pointer",
              background:
                "linear-gradient(to right, #38bdf8, #6366f1)",
              color: "#020817",
            }}
          >
            Enter Facelytics
          </button>
        </form>
      </div>
    </div>
  );
};
