import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QUESTIONS, PILLARS } from "../data/questionBank";
import TopHeader from "../components/TopHeader";

type Score = 0 | 1 | 2 | 3 | "NA";

type AnswersStorage = {
  token?: string;
  answers: Record<string, Score>;
};

type Profile = {
  organisationName?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  roleTitle?: string;
  ictTeamSize?: string;
  token?: string;
};

const ANSWERS_BASE_KEY = "ppqsa_answers_v1";
const PROFILE_BASE_KEY = "ppqsa_profile_v1";
const TARGET_PILLAR_KEY = "ppqsa_target_pillar_v1";

function storageKey(base: string, token?: string) {
  return token ? `${base}_${token}` : base;
}

export default function ReviewPage() {
  const nav = useNavigate();
  const params = useParams<{ token?: string }>();
  const token = params.token ?? undefined;

  const answers = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey(ANSWERS_BASE_KEY, token));

      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;

      if (parsed && typeof parsed === "object" && "answers" in (parsed as object)) {
        const stored = parsed as AnswersStorage;
        if (token) {
          if (!stored.token) return {};
          if (stored.token !== token) return {};
        } else if (stored.token) {
          return {};
        }
        return stored.answers || {};
      }

      // Backward compatibility: previously stored as a raw answers map.
      if (token) return {};
      return parsed as Record<string, Score>;
    } catch {
      return {};
    }
  }, [token]);

  const profile = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey(PROFILE_BASE_KEY, token));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Profile;
      if (token) {
        if (!parsed.token) return null;
        if (parsed.token !== token) return null;
      } else if (parsed.token) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }, [token]);

  const missing = useMemo(() => {
    return QUESTIONS.filter((q) => answers[q.id] === undefined);
  }, [answers]);

  const missingByPillar = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of PILLARS) map[p.code] = 0;

    for (const q of missing) {
      map[q.pillarCode] += 1;
    }

    return map;
  }, [missing]);

  const missingQuestionsByPillar = useMemo(() => {
    const grouped: Record<string, typeof QUESTIONS> = {};
    for (const p of PILLARS) grouped[p.code] = [];

    for (const q of missing) {
      grouped[q.pillarCode].push(q);
    }

    // Keep a stable, predictable ordering within each pillar.
    for (const p of PILLARS) {
      grouped[p.code].sort((a, b) => a.order - b.order);
    }

    return grouped;
  }, [missing]);

  const canSubmit = missing.length === 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        padding: "24px 16px",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ width: "min(980px, 100%)", margin: "0 auto" }}>
        <TopHeader current="review" />

        <h1 style={{ marginTop: 16, marginBottom: 0, color: "white", fontSize: 40, letterSpacing: -0.5 }}>
          Review and submit
        </h1>
        <p style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 16, maxWidth: 820 }}>
          Confirm your organisation details and ensure all questions are answered before generating your results.
        </p>

        {/* Profile summary */}
        <div
          style={{
            marginTop: 16,
            background: "#ffffff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18, fontWeight: 900, color: "#0b1220" }}>
            Organisation summary
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, color: "#0b1220" }}>
            <div>
              <strong>Assessment ID:</strong> {token || "Not set"}
            </div>
            <div>
              <strong>Organisation:</strong> {profile?.organisationName || "Not set"}
            </div>
            <div>
              <strong>Country:</strong> {profile?.country || "Not set"}
            </div>
            <div>
              <strong>Contact:</strong> {profile?.contactName || "Not set"} ({profile?.contactEmail || "Not set"})
            </div>
            <div>
              <strong>Role:</strong> {profile?.roleTitle || "Not set"}
            </div>
            <div>
              <strong>Team size:</strong> {profile?.ictTeamSize || "Not set"}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => nav(token ? `/profile/${token}` : "/profile")}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: "pointer",
                fontWeight: 900,
                color: "#0b1220",
              }}
            >
              Edit organisation details
            </button>
          </div>
        </div>

        {/* Completion check */}
        <div
          style={{
            marginTop: 14,
            background: "#ffffff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18, fontWeight: 900, color: "#0b1220" }}>
            Assessment completion
          </h2>

          {missing.length === 0 ? (
            <div style={{ color: "#0b1220", fontWeight: 900 }}>All questions are answered.</div>
          ) : (
            <>
              <div style={{ color: "#b91c1c", fontWeight: 900 }}>
                Incomplete: {missing.length} {missing.length === 1 ? "question" : "questions"} remaining
              </div>

              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PILLARS.map((p) => (
                  <div
                    key={p.code}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 999,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#0b1220",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {p.code}: {missingByPillar[p.code]}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {PILLARS.filter((p) => (missingQuestionsByPillar[p.code]?.length || 0) > 0).map((p) => {
                  const items = missingQuestionsByPillar[p.code] || [];

                  return (
                    <div
                      key={p.code}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 14,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ color: "#0b1220" }}>
                          <div style={{ fontWeight: 900, fontSize: 14 }}>
                            {p.code} — {p.name}
                          </div>
                          <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 800 }}>
                            {items.length} {items.length === 1 ? "question" : "questions"} missing
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            sessionStorage.setItem(TARGET_PILLAR_KEY, p.code);
                            nav(token ? `/assessment/${token}` : "/start?inviteRequired=1");
                          }}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 14,
                            border: "1px solid #0b1220",
                            background: "#0b1220",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Jump to pillar
                        </button>
                      </div>

                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        {items.map((q) => (
                          <div key={q.id} style={{ color: "#0b1220" }}>
                            <div style={{ fontWeight: 900, fontSize: 13 }}>{q.id}</div>
                            <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.35 }}>{q.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => nav(token ? `/assessment/${token}` : "/start?inviteRequired=1")}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "1px solid #0b1220",
                    background: "#0b1220",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Return to assessment
                </button>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => nav(token ? `/assessment/${token}` : "/start?inviteRequired=1")}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Back
          </button>

          <button
            onClick={() => nav(token ? `/start/${token}?saved=1` : "/start?inviteRequired=1")}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Save & Exit
          </button>

          <button
            onClick={() => {
              const ok = window.confirm(
                "Are you sure? This will clear the saved profile and answers for this assessment ID. History snapshots will be kept."
              );
              if (!ok) return;

              localStorage.removeItem(storageKey(PROFILE_BASE_KEY, token));
              localStorage.removeItem(storageKey(ANSWERS_BASE_KEY, token));
              nav(token ? `/start/${token}` : "/start");
            }}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Reset this assessment
          </button>

          <button
            onClick={() => nav(token ? `/results/${token}` : "/start?inviteRequired=1")}
            disabled={!canSubmit}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #ffffff",
              background: "#ffffff",
              color: "#0b1220",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.45,
              fontWeight: 900,
            }}
          >
            Submit and view results
          </button>
        </div>
      </div>
    </div>
  );
}
