"use client";

import { useState } from "react";

function veiligDoel(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wachtwoord) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wachtwoord }),
      });
      if (res.ok) {
        window.location.replace(veiligDoel());
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setFout(data.error ?? "Inloggen mislukt");
    } catch {
      setFout("Kan de server niet bereiken");
    } finally {
      setBezig(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 340,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow)",
          padding: 24,
          display: "grid",
          gap: 14,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>Label Printer</h1>
        <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--muted)" }}>
          Wachtwoord
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            style={{
              padding: "10px 12px",
              fontSize: 16,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
            }}
          />
        </label>
        {fout && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{fout}</p>}
        <button
          type="submit"
          disabled={bezig || !wachtwoord}
          style={{
            padding: "11px 12px",
            fontSize: 15,
            fontWeight: 600,
            border: 0,
            borderRadius: "var(--radius)",
            background: "var(--accent)",
            color: "#fff",
            opacity: bezig || !wachtwoord ? 0.6 : 1,
            cursor: "pointer",
          }}
        >
          {bezig ? "Bezig…" : "Inloggen"}
        </button>
      </form>
    </main>
  );
}
