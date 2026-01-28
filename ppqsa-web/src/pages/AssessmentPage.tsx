import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QUESTIONS, PILLARS, type PillarCode } from "../data/questionBank";
import TopHeader from "../components/TopHeader";

type Score = 0 | 1 | 2 | 3 | "NA";

const ANSWERS_BASE_KEY = "ppqsa_answers_v1";
const TARGET_PILLAR_KEY = "ppqsa_target_pillar_v1";
const NOTES_BASE_KEY = "ppqsa_pillar_notes_v1";

type AnswersStorage = {
  token?: string;
  answers: Record<string, Score>;
};

type NotesStorage = {
  token?: string;
  notes: Record<string, string>;
};

function storageKey(base: string, token?: string) {
  return token ? `${base}_${token}` : base;
}

function loadInitialPillarIndex(): number {
  try {
    const raw = sessionStorage.getItem(TARGET_PILLAR_KEY);
    if (!raw) return 0;

    const idx = PILLARS.findIndex((p) => p.code === raw);
    sessionStorage.removeItem(TARGET_PILLAR_KEY);
    return idx >= 0 ? idx : 0;
  } catch {
    return 0;
  }
}

function loadSavedAnswers(token?: string): Record<string, Score> {
  try {
    const raw = localStorage.getItem(storageKey(ANSWERS_BASE_KEY, token));
    if (!raw) {
      // Migration: pull forward any old sessionStorage value.
      const legacyRaw = sessionStorage.getItem(ANSWERS_BASE_KEY);
      if (!legacyRaw) return {};

      const parsedLegacy = JSON.parse(legacyRaw) as unknown;
      if (parsedLegacy && typeof parsedLegacy === "object" && "answers" in (parsedLegacy as object)) {
        const storedLegacy = parsedLegacy as AnswersStorage;
        if (token) {
          if (!storedLegacy.token) return {};
          if (storedLegacy.token !== token) return {};
        } else if (storedLegacy.token) {
          return {};
        }

        localStorage.setItem(storageKey(ANSWERS_BASE_KEY, token), JSON.stringify(storedLegacy));
        sessionStorage.removeItem(ANSWERS_BASE_KEY);
        return storedLegacy.answers || {};
      }

      // Backward compatibility: legacy was a raw answers map.
      if (token) return {};
      localStorage.setItem(storageKey(ANSWERS_BASE_KEY, token), JSON.stringify(parsedLegacy));
      sessionStorage.removeItem(ANSWERS_BASE_KEY);
      return parsedLegacy as Record<string, Score>;
    }

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
}

function saveAnswers(answers: Record<string, Score>, token?: string) {
  const payload: AnswersStorage = { token, answers };
  localStorage.setItem(storageKey(ANSWERS_BASE_KEY, token), JSON.stringify(payload));
}

function loadSavedNotes(token?: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(storageKey(NOTES_BASE_KEY, token));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "notes" in (parsed as object)) {
      const stored = parsed as NotesStorage;
      if (token) {
        if (!stored.token) return {};
        if (stored.token !== token) return {};
      } else if (stored.token) {
        return {};
      }

      return stored.notes || {};
    }

    if (token) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function saveNotes(notes: Record<string, string>, token?: string) {
  const payload: NotesStorage = { token, notes };
  localStorage.setItem(storageKey(NOTES_BASE_KEY, token), JSON.stringify(payload));
}

export default function AssessmentPage() {
  const nav = useNavigate();
  const params = useParams<{ token?: string }>();
  const token = params.token ?? undefined;

  const pillars = useMemo(() => PILLARS, []);
  const [pillarIndex, setPillarIndex] = useState<number>(() => loadInitialPillarIndex());
  const [answers, setAnswers] = useState<Record<string, Score>>(() => loadSavedAnswers(token));
  const [pillarNotes, setPillarNotes] = useState<Record<string, string>>(() => loadSavedNotes(token));

  const shownCompletionForPillarRef = useRef<Set<PillarCode>>(new Set());
  const completionTimerRef = useRef<number | null>(null);
  const [showPillarCompleteBanner, setShowPillarCompleteBanner] = useState(false);

  const activePillar = pillars[pillarIndex];

  const pillarQuestions = useMemo(() => {
    return QUESTIONS.filter((q) => q.pillarCode === activePillar.code).sort((a, b) => a.order - b.order);
  }, [activePillar.code]);

  useEffect(() => {
    saveAnswers(answers, token);
  }, [answers, token]);

  useEffect(() => {
    saveNotes(pillarNotes, token);
  }, [pillarNotes, token]);

  const clearCompletionTimer = () => {
    if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current);
    completionTimerRef.current = null;
  };

  const hideCompletionBanner = () => {
    clearCompletionTimer();
    setShowPillarCompleteBanner(false);
  };

  const showCompletionBannerOnceForCurrentPillar = () => {
    const code = activePillar.code;
    if (shownCompletionForPillarRef.current.has(code)) return;

    shownCompletionForPillarRef.current.add(code);
    setShowPillarCompleteBanner(true);

    clearCompletionTimer();
    completionTimerRef.current = window.setTimeout(() => {
      setShowPillarCompleteBanner(false);
    }, 3500);
  };

  const setScore = (questionId: string, score: Score) => {
    setAnswers((prev) => {
      const wasComplete = pillarQuestions.every((q) => prev[q.id] !== undefined);
      const next = { ...prev, [questionId]: score };
      const isComplete = pillarQuestions.every((q) => next[q.id] !== undefined);

      if (!wasComplete && isComplete) {
        showCompletionBannerOnceForCurrentPillar();
      }

      return next;
    });
  };

  const canContinue = useMemo(() => {
    return pillarQuestions.every((q) => answers[q.id] !== undefined);
  }, [pillarQuestions, answers]);

  const totalQuestions = QUESTIONS.length;

  const answeredCount = useMemo(() => {
    return Object.keys(answers).filter((qid) => QUESTIONS.some((q) => q.id === qid)).length;
  }, [answers]);

  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const goNext = () => {
    hideCompletionBanner();
    if (pillarIndex < pillars.length - 1) {
      setPillarIndex((x) => x + 1);
      return;
    }
    // ✅ Important: go to review first, not results
    nav(token ? `/review/${token}` : "/start?inviteRequired=1");
  };

  const goPrevPillar = () => {
    hideCompletionBanner();
    if (pillarIndex > 0) setPillarIndex((x) => x - 1);
  };

  const jumpToPillar = (pillarCode: PillarCode) => {
    hideCompletionBanner();
    const idx = pillars.findIndex((p) => p.code === pillarCode);
    if (idx >= 0) setPillarIndex(idx);
  };

  const footerRightLabel = pillarIndex < pillars.length - 1 ? "Next pillar" : "Review and submit";
  const completionNextHint =
    pillarIndex < pillars.length - 1 ? "You can proceed to the next pillar." : "You can proceed to review and submit.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        padding: "24px 16px",
        fontFamily: "system-ui",
        boxSizing: "border-box",
      }}
    >
      {/* ✅ Always-centred container */}
      <div
        style={{
          width: "min(980px, 100%)",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <TopHeader current="assessment" />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <div style={{ minWidth: 260 }}>
            <h1 style={{ margin: 0, color: "white", fontSize: 44, letterSpacing: -0.5 }}>
              Assessment
            </h1>
            <p style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 16 }}>
              Pillar {pillarIndex + 1} of {pillars.length}:{" "}
              <strong style={{ color: "white" }}>
                {activePillar.code} — {activePillar.name}
              </strong>
            </p>
          </div>

          {/* Progress */}
          <div style={{ textAlign: "right", minWidth: 260, flex: "1 1 260px" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
              Progress: <strong style={{ color: "white" }}>{answeredCount}</strong> / {totalQuestions}
            </div>

            <div
              style={{
                height: 10,
                background: "rgba(255,255,255,0.18)",
                borderRadius: 999,
                overflow: "hidden",
                marginTop: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: "#ffffff",
                }}
              />
            </div>

            <div style={{ fontSize: 12, marginTop: 6, color: "rgba(255,255,255,0.6)" }}>
              {progressPercent}% complete
            </div>

            <button
              onClick={() => nav(token ? `/start/${token}?saved=1` : "/start?inviteRequired=1")}
              style={{
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              Save & Exit
            </button>
          </div>
        </div>

        {/* Pillar Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {pillars.map((p) => {
            const isActive = p.code === activePillar.code;
            return (
              <button
                key={p.code}
                onClick={() => jumpToPillar(p.code)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: isActive ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.25)",
                  background: isActive ? "#ffffff" : "rgba(255,255,255,0.08)",
                  color: isActive ? "#0b1220" : "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
                title={p.name}
              >
                {p.code}
              </button>
            );
          })}
        </div>

        {/* Main Card */}
        <div
          style={{
            marginTop: 16,
            borderRadius: 18,
            padding: 18,
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {/* Pillar completion banner */}
          {showPillarCompleteBanner && (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                color: "#065f46",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 800 }}>
                Pillar {activePillar.code} is complete. {completionNextHint}
              </div>

              <button
                onClick={hideCompletionBanner}
                aria-label="Dismiss"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#065f46",
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Scoring guidance */}
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#0b1220",
              fontSize: 14,
              lineHeight: 1.35,
            }}
          >
            <strong>Scoring guide:</strong> 0 (Not in place) → 3 (Managed and measurable) •{" "}
            <strong>N/A</strong> excludes the question from the pillar average.
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              color: "#0b1220",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes for {activePillar.code}</div>
            <textarea
              value={pillarNotes[activePillar.code] || ""}
              onChange={(event) =>
                setPillarNotes((prev) => ({
                  ...prev,
                  [activePillar.code]: event.target.value,
                }))
              }
              rows={3}
              placeholder="Optional notes for this pillar."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                fontFamily: "system-ui",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </div>

          {/* Questions */}
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            {pillarQuestions.map((q) => {
              const current = answers[q.id];

              return (
                <div
                  key={q.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: 16,
                    background: "#ffffff",
                    color: "#0b1220",
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
                    <div>
                      <div style={{ fontWeight: 800, color: "#0b1220" }}>{q.id}</div>
                      <div style={{ marginTop: 6, lineHeight: 1.35, fontSize: 15, color: "#0b1220" }}>
                        {q.text}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: answers[q.id] !== undefined ? "#065f46" : "#475569",
                        background: answers[q.id] !== undefined ? "#ecfdf5" : "#f1f5f9",
                        border: answers[q.id] !== undefined ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontWeight: 800,
                      }}
                    >
                      {answers[q.id] !== undefined ? "Answered" : "Not answered"}
                    </div>
                  </div>

                  {/* Score buttons */}
                  <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                    {[0, 1, 2, 3].map((n) => {
                      const selected = current === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setScore(q.id, n as Score)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 14,
                            border: selected ? "2px solid #0b1220" : "1px solid #cbd5e1",
                            background: selected ? "#0b1220" : "#ffffff",
                            color: selected ? "#ffffff" : "#0b1220",
                            cursor: "pointer",
                            minWidth: 52,
                            fontWeight: 800,
                            fontSize: 14,
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setScore(q.id, "NA")}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 14,
                        border: current === "NA" ? "2px solid #0b1220" : "1px solid #cbd5e1",
                        background: current === "NA" ? "#0b1220" : "#ffffff",
                        color: current === "NA" ? "#ffffff" : "#0b1220",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      N/A
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 12 }}>
            <button
              onClick={goPrevPillar}
              disabled={pillarIndex === 0}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: pillarIndex === 0 ? "not-allowed" : "pointer",
                opacity: pillarIndex === 0 ? 0.5 : 1,
                fontWeight: 800,
                color: "#0b1220",
              }}
            >
              Previous pillar
            </button>

            <button
              onClick={goNext}
              disabled={!canContinue}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #0b1220",
                background: "#0b1220",
                color: "#ffffff",
                cursor: canContinue ? "pointer" : "not-allowed",
                opacity: canContinue ? 1 : 0.45,
                fontWeight: 900,
              }}
            >
              {footerRightLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
