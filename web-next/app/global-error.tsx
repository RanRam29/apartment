"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: "sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>משהו השתבש</h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>אירעה שגיאה קריטית באפליקציה.</p>
          <button
            onClick={reset}
            style={{ padding: "0.6rem 2rem", borderRadius: "9999px", background: "#1a7f4e", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
