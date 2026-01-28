import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isAdminGateEnabled, setAdminAuthed, verifyAdminCode } from "../utils/adminAuth";

function useQueryParam(name: string): string | null {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }, [location.search, name]);
}

export default function AdminLoginPage() {
  const nav = useNavigate();
  const nextParam = useQueryParam("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/admin";

  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const gateEnabled = isAdminGateEnabled();

  const submit = () => {
    setError(null);

    if (!gateEnabled) {
      // Gate disabled: allow access.
      setAdminAuthed(true);
      nav(next, { replace: true });
      return;
    }

    const ok = verifyAdminCode(code);
    if (!ok) {
      setAdminAuthed(false);
      setError("Incorrect code");
      return;
    }

    setAdminAuthed(true);
    nav(next, { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        padding: "24px 16px",
        fontFamily: "system-ui",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ width: "min(560px, 100%)", margin: "0 auto" }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <h1 style={{ margin: 0, color: "#0b1220", fontSize: 28, letterSpacing: -0.4 }}>Admin login</h1>
          <p style={{ marginTop: 10, color: "#334155", fontSize: 14, lineHeight: 1.45 }}>
            Enter the admin passcode to access restricted pages.
          </p>

          {!gateEnabled ? (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 900, color: "#0b1220" }}>Admin gate is not configured</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#334155", fontWeight: 800 }}>
                Set <span style={{ fontFamily: "monospace" }}>VITE_ADMIN_CODE</span> to enable the gate.
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }} htmlFor="admin-code">
              Passcode
            </label>
            <input
              id="admin-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={gateEnabled ? "Enter code" : "(Gate disabled)"}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                fontWeight: 900,
                color: "#0b1220",
              }}
            />
            {error ? (
              <div role="alert" style={{ marginTop: 4, color: "#dc2626", fontWeight: 900, fontSize: 13 }}>
                {error}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={submit}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #0b1220",
                background: "#0b1220",
                color: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Continue
            </button>
            <Link
              to="/start"
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0b1220",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Back
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 12, color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
          This is a basic gate for casual access (not high security).
        </div>
      </div>
    </div>
  );
}
