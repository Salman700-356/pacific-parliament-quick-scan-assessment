import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const TOKEN_KEY = "ppqsa_token_v1";
const PROFILE_BASE_KEY = "ppqsa_profile_v1";
const ANSWERS_BASE_KEY = "ppqsa_answers_v1";

type AnswersStorage = {
  token?: string;
  answers: Record<string, unknown>;
};

function storageKey(base: string, token?: string) {
  return token ? `${base}_${token}` : base;
}

export default function StartPage() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams<{ token?: string }>();

  useEffect(() => {
    if (params.token) sessionStorage.setItem(TOKEN_KEY, params.token);
  }, [params.token]);

  const token = useMemo(() => params.token ?? undefined, [params.token]);

  const inviteRequired = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("inviteRequired") === "1";
  }, [location.search]);

  const hasResumeData = useMemo(() => {
    try {
      if (!token) return false;
      const answersRaw = localStorage.getItem(storageKey(ANSWERS_BASE_KEY, token));
      if (answersRaw) {
        const parsed = JSON.parse(answersRaw) as unknown;
        if (parsed && typeof parsed === "object" && "answers" in (parsed as object)) {
          const stored = parsed as AnswersStorage;
          return Object.keys(stored.answers || {}).length > 0;
        }
        if (parsed && typeof parsed === "object") return Object.keys(parsed as Record<string, unknown>).length > 0;
        return true;
      }

      const profileRaw = localStorage.getItem(storageKey(PROFILE_BASE_KEY, token));
      return Boolean(profileRaw);
    } catch {
      return false;
    }
  }, [token]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 900, width: "100%" }}>
        <h1
          style={{
            fontSize: 46,
            fontWeight: 900,
            color: "#ffffff",
            marginBottom: 12,
            letterSpacing: -0.5,
          }}
        >
          Pacific Parliament Quick Scan Assessment
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.8)",
            maxWidth: 760,
            lineHeight: 1.5,
          }}
        >
          A lightweight cybersecurity maturity quick scan for Pacific parliaments.
          Complete this assessment to receive an overall maturity score, a pillar breakdown,
          and practical, low-cost quick wins.
        </p>

        <div
          style={{
            marginTop: 28,
            background: "#ffffff",
            borderRadius: 20,
            padding: 26,
            maxWidth: 760,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 22, fontWeight: 900, color: "#0b1220" }}>
            Start the assessment
          </h2>

          {(!token || inviteRequired) && (
            <div
              role="status"
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              Invite link required
            </div>
          )}

          <p style={{ color: "#334155", fontSize: 16, lineHeight: 1.5, marginBottom: 18 }}>
            Estimated time: <strong>10–15 minutes</strong>. You can update your answers before submitting.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {hasResumeData && (
              <button
                onClick={() => token && nav(`/assessment/${token}`)}
                disabled={!token}
                style={{
                  padding: "14px 20px",
                  borderRadius: 14,
                  border: "1px solid #0b1220",
                  background: "#ffffff",
                  color: "#0b1220",
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: token ? "pointer" : "not-allowed",
                  opacity: token ? 1 : 0.55,
                }}
              >
                Resume assessment
              </button>
            )}

            <button
              onClick={() => token && nav(`/profile/${token}`)}
              disabled={!token}
              style={{
                padding: "14px 20px",
                borderRadius: 14,
                border: "none",
                background: "#0b1220",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 900,
                cursor: token ? "pointer" : "not-allowed",
                opacity: token ? 1 : 0.55,
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
