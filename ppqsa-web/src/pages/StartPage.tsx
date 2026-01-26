import { useNavigate } from "react-router-dom";

export default function StartPage() {
  const nav = useNavigate();

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Pacific Parliament Quick Scan Assessment</h1>
      <p style={{ opacity: 0.85 }}>
        A lightweight cyber maturity quick scan for Pacific Parliaments.
      </p>

      <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>Start</h2>
        <p>This demo will take you through the assessment wizard.</p>

        <button
          onClick={() => nav("/assessment")}
          style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10 }}
        >
          Begin Assessment
        </button>
      </div>
    </div>
  );
}
