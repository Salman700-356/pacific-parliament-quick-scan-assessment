import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QUESTIONS, PILLARS } from "../data/questionBank";
import TopHeader from "../components/TopHeader";
import { QUICK_WINS_LIBRARY } from "../data/quickWinsLibrary";
import { confidenceLabel } from "../utils/confidence";
import { appendSnapshotV1, readSnapshotsV1, writeSnapshotsV1, type Score, type SnapshotV1 } from "../utils/snapshots";

const ANSWERS_BASE_KEY = "ppqsa_answers_v1";
const PROFILE_BASE_KEY = "ppqsa_profile_v1";
const TARGET_SCORE_KEY = "ppqsa_target_score24_v1";
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

type Profile = {
  organisationName?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  roleTitle?: string;
  ictTeamSize?: string;
  token?: string;
};

function csvEscape(value: string) {
  if (/[\n\r",]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function loadTargetScore24(): number {
  try {
    const raw = localStorage.getItem(TARGET_SCORE_KEY);
    if (raw === null || raw.trim() === "") return 18;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 18;
    return clamp(value, 0, 24);
  } catch {
    return 18;
  }
}

function maturityBand(score24: number) {
  if (score24 < 6) return "Foundational";
  if (score24 < 12) return "Developing";
  if (score24 < 18) return "Established";
  return "Mature";
}

function bandDescription(band: string) {
  switch (band) {
    case "Foundational":
      return "Core cybersecurity controls are limited or inconsistent. Focus first on a small number of practical basics (MFA, backups, patching, admin separation).";
    case "Developing":
      return "Controls exist in some areas but may be inconsistent or not embedded. Focus on consistency, ownership, and quick standardisation.";
    case "Established":
      return "Most foundational controls are in place. Focus on improving monitoring, testing, and strengthening governance and resilience.";
    case "Mature":
      return "Strong baseline maturity. Focus on continuous improvement, metrics, assurance testing, and operational resilience.";
    default:
      return "";
  }
}

function calcPillarScores(answers: Record<string, Score>) {
  const pillarMap = new Map<
    string,
    { code: string; name: string; avg: number; answered: number; total: number }
  >();

  for (const p of PILLARS) {
    const questions = QUESTIONS.filter((q) => q.pillarCode === p.code);

    let sum = 0;
    let count = 0;

    for (const q of questions) {
      const a = answers[q.id];
      if (a === undefined) continue;
      if (a === "NA") continue;

      sum += a;
      count += 1;
    }

    const avg = count > 0 ? sum / count : 0;

    pillarMap.set(p.code, {
      code: p.code,
      name: p.name,
      avg,
      answered: count,
      total: questions.length,
    });
  }

  return Array.from(pillarMap.values());
}

function calcTotalScore24(pillarScores: Array<{ avg: number }>) {
  // Total /24 = sum of 8 pillar averages (each average is 0–3)
  const total = pillarScores.reduce((acc, p) => acc + p.avg, 0);
  return Number(total.toFixed(2));
}

function buildQuickWins(answers: Record<string, Score>) {
  // quick win = answered 0 or 1 (not NA)
  const wins = QUESTIONS.flatMap((q) => {
    const a = answers[q.id];
    if (a !== 0 && a !== 1) return [];

    const rec = QUICK_WINS_LIBRARY[q.id];
    if (!rec) return [];

    return [
      {
        id: q.id,
        pillar: q.pillarCode,
        questionText: q.text,
        score: a,
        ...rec,
      },
    ];
  });

  return wins;
}

export default function ResultsPage() {
  const nav = useNavigate();
  const params = useParams<{ token?: string }>();
  const token = params.token ?? undefined;

  const [snapshots, setSnapshots] = useState<SnapshotV1[]>(() => readSnapshotsV1());
  const [targetScore24, setTargetScore24] = useState<number>(() => loadTargetScore24());
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);

  const setTransientSnapshotStatus = (message: string) => {
    setSnapshotStatus(message);
    window.setTimeout(() => setSnapshotStatus(null), 2500);
  };

  const answersFingerprint = (raw: Record<string, Score>) => {
    const keys = Object.keys(raw).sort((a, b) => a.localeCompare(b));
    return keys.map((k) => `${k}:${String(raw[k])}`).join("|");
  };

  const isDuplicateWithin60s = (candidate: SnapshotV1) => {
    const tokenLabel = token ?? "default";
    const relevant = snapshots.filter((s) => (s.token || "default") === tokenLabel);
    if (relevant.length === 0) return false;

    // Find latest snapshot for this token.
    const latest = relevant.reduce<SnapshotV1>((acc, s) => {
      const at = Date.parse(acc.timestampISO);
      const bt = Date.parse(s.timestampISO);
      if (Number.isNaN(at) && Number.isNaN(bt)) return s.timestampISO > acc.timestampISO ? s : acc;
      if (Number.isNaN(at)) return s;
      if (Number.isNaN(bt)) return acc;
      return bt > at ? s : acc;
    }, relevant[0]);

    const latestTime = Date.parse(latest.timestampISO);
    const candidateTime = Date.parse(candidate.timestampISO);
    if (Number.isNaN(latestTime) || Number.isNaN(candidateTime)) return false;

    const within60s = candidateTime - latestTime < 60_000;
    if (!within60s) return false;

    // Block only if answers are unchanged.
    return answersFingerprint(latest.rawAnswers) === answersFingerprint(candidate.rawAnswers);
  };

  const openPrintView = () => {
    const printPath = token ? `/results/${token}/print` : "/start?inviteRequired=1";
    const printWindow = window.open(printPath, "_blank", "noopener,noreferrer");
    if (!printWindow) {
      nav(printPath);
      return;
    }

    // Best-effort: attempt to trigger print from the new tab after it loads.
    // The print page also auto-calls window.print() on mount.
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > 5000) {
        window.clearInterval(timer);
        return;
      }

      try {
        if (printWindow.document?.readyState === "complete") {
          printWindow.focus();
          printWindow.print();
          window.clearInterval(timer);
        }
      } catch {
        // ignore cross-timing issues
      }
    }, 250);
  };

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

  const pillarNotes = useMemo(() => {
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
  }, [token]);

  const { pillarScoresSorted, pillarScoresInPillarOrder, total24, band, quickWins } = useMemo(() => {
    const pillarScoresInPillarOrder = calcPillarScores(answers);
    const total24 = calcTotalScore24(pillarScoresInPillarOrder);
    const band = maturityBand(total24);
    const quickWins = buildQuickWins(answers);

    // sort: lowest pillar first (for UI)
    const pillarScoresSorted = [...pillarScoresInPillarOrder].sort((a, b) => a.avg - b.avg);

    return { pillarScoresSorted, pillarScoresInPillarOrder, total24, band, quickWins };
  }, [answers]);

  useEffect(() => {
    try {
      localStorage.setItem(TARGET_SCORE_KEY, String(clamp(targetScore24, 0, 24)));
    } catch {
      // ignore
    }
  }, [targetScore24]);

  const createSnapshotPayload = (timestampISO: string): SnapshotV1 => {
    const tokenLabel = token ?? "default";
    const organisationName = profile?.organisationName?.trim() || "Not set";
    const country = profile?.country?.trim() || "Not set";
    const contactEmail = profile?.contactEmail?.trim() || "";

    return {
      token: tokenLabel,
      organisationName,
      country,
      contactEmail,
      timestampISO,
      totalScore24: total24,
      band,
      pillarAverages: pillarScoresInPillarOrder.map((p) => ({
        pillarCode: p.code,
        pillarName: p.name,
        averageScore: Number(p.avg.toFixed(4)),
        answeredCount: p.answered,
        questionCount: p.total,
      })),
      pillarNotes,
      rawAnswers: answers,
    };
  };

  const snapshotsNewestFirst = useMemo(() => {
    const tokenLabel = token ?? "default";
    const filtered = snapshots.filter((s) => s.token === tokenLabel);

    return [...filtered].sort((a, b) => {
      const at = Date.parse(a.timestampISO);
      const bt = Date.parse(b.timestampISO);
      if (Number.isNaN(at) || Number.isNaN(bt)) return b.timestampISO.localeCompare(a.timestampISO);
      return bt - at;
    });
  }, [snapshots, token]);

  const answeredCount = useMemo(() => {
    const keys = Object.keys(answers);
    return keys.filter((qid) => QUESTIONS.some((q) => q.id === qid)).length;
  }, [answers]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        padding: "28px 16px",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <TopHeader current="results" />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "white", fontSize: 44, letterSpacing: -0.5 }}>
              Results
            </h1>
            <p style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 16 }}>
              Assessment completed:{" "}
              <strong style={{ color: "white" }}>{answeredCount}</strong> / {QUESTIONS.length} questions answered
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {snapshotStatus ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(16,185,129,0.16)",
                  color: "white",
                  fontWeight: 900,
                }}
              >
                {snapshotStatus}
              </div>
            ) : null}

            <button
              onClick={openPrintView}
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
              Print / Save PDF
            </button>
            <button
              onClick={() => {
                const timestampISO = new Date().toISOString();

                const payload = createSnapshotPayload(timestampISO);

                downloadBlob(
                  `ppqsa-results-${timestampISO}.json`,
                  "application/json;charset=utf-8",
                  JSON.stringify(payload, null, 2)
                );
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
              Export JSON
            </button>

            <button
              onClick={() => {
                const timestampISO = new Date().toISOString();
                const payload = createSnapshotPayload(timestampISO);

                if (isDuplicateWithin60s(payload)) {
                  setTransientSnapshotStatus("Snapshot already saved");
                  return;
                }

                setSnapshots(() => appendSnapshotV1(payload));
                setTransientSnapshotStatus("Snapshot saved");
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
              Save Snapshot
            </button>

            <button
              onClick={() => {
                const timestamp = new Date().toISOString();
                const rows = [
                  ["questionId", "pillarCode", "questionText", "score", "pillarNote"],
                  ...QUESTIONS.map((q) => {
                    const score = answers[q.id];
                    const note = pillarNotes[q.pillarCode] || "";
                    return [q.id, q.pillarCode, q.text, score === undefined ? "" : String(score), note];
                  }),
                ];

                const csv = rows.map((r) => r.map((c) => csvEscape(c)).join(",")).join("\n");
                downloadBlob(`ppqsa-results-${timestamp}.csv`, "text/csv;charset=utf-8", csv);
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
              Export CSV
            </button>

            <button
              onClick={() => nav(token ? `/assessment/${token}` : "/start?inviteRequired=1")}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Edit answers
            </button>
          </div>
        </div>

        {/* Score Summary Cards */}
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 14,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, color: "#475569", fontWeight: 700 }}>Total score</div>
                <div style={{ fontSize: 38, fontWeight: 900, color: "#0b1220", marginTop: 6 }}>
                  {total24} <span style={{ fontSize: 16, fontWeight: 800, color: "#475569" }}>/ 24</span>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>Target maturity score</div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={24}
                      step={0.25}
                      value={targetScore24}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next)) return;
                        setTargetScore24(clamp(next, 0, 24));
                      }}
                      style={{
                        width: 110,
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid #cbd5e1",
                        fontWeight: 900,
                        color: "#0b1220",
                      }}
                      aria-label="Target maturity score out of 24"
                    />
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#475569" }}>/ 24</div>
                  </div>
                </div>
              </div>

              <div style={{ minWidth: 280 }}>
                <div style={{ fontSize: 14, color: "#475569", fontWeight: 700 }}>Maturity band</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0b1220", marginTop: 6 }}>
                  {band}
                </div>
                <div style={{ fontSize: 14, color: "#334155", marginTop: 6, lineHeight: 1.45 }}>
                  {bandDescription(band)}
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0b1220" }}>History</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                  Target: <span style={{ color: "#0b1220", fontWeight: 900 }}>{targetScore24}</span> / 24
                </div>

                <button
                  onClick={() => {
                    writeSnapshotsV1([]);
                    setSnapshots([]);
                  }}
                  disabled={snapshots.length === 0}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor: snapshots.length === 0 ? "not-allowed" : "pointer",
                    opacity: snapshots.length === 0 ? 0.45 : 1,
                    fontWeight: 900,
                    color: "#0b1220",
                  }}
                >
                  Clear history
                </button>
              </div>
            </div>

            {snapshotsNewestFirst.length === 0 ? (
              <div style={{ marginTop: 12, color: "#334155" }}>
                No snapshots saved yet. Use “Save snapshot” to store results.
              </div>
            ) : (
              <div style={{ marginTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          fontSize: 12,
                          color: "#64748b",
                          padding: "10px 8px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Date
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          fontSize: 12,
                          color: "#64748b",
                          padding: "10px 8px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Total score (/24)
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          fontSize: 12,
                          color: "#64748b",
                          padding: "10px 8px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Maturity band
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshotsNewestFirst.map((s) => {
                      const date = (() => {
                        const t = Date.parse(s.timestampISO);
                        if (Number.isNaN(t)) return s.timestampISO;
                        return new Date(t).toLocaleString();
                      })();

                      return (
                        <tr key={s.timestampISO}>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220" }}>
                            {date}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                            {s.totalScore24}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                            {s.band}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pillar breakdown */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0b1220" }}>
                Pillar breakdown
              </h2>
              <div style={{ fontSize: 13, color: "#64748b" }}>Each pillar is scored 0–3</div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {pillarScoresSorted.map((p) => {
                const pct = Math.round((p.avg / 3) * 100);
                const confidence = confidenceLabel(p.answered, p.total);

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
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, color: "#0b1220" }}>
                          {p.code} — {p.name}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
                          Answered: {p.answered} / {p.total}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, color: "#0b1220" }}>{p.avg.toFixed(2)} / 3</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{pct}%</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                          Confidence: {confidence}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        height: 10,
                        background: "#e2e8f0",
                        borderRadius: 999,
                        overflow: "hidden",
                        marginTop: 10,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "#0b1220",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0b1220" }}>Notes</h2>
              <div style={{ fontSize: 13, color: "#64748b" }}>Optional notes by pillar</div>
            </div>

            {PILLARS.every((p) => !(pillarNotes[p.code] || "").trim()) ? (
              <div style={{ marginTop: 12, color: "#334155" }}>No notes were added.</div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {PILLARS.map((p) => {
                  const note = (pillarNotes[p.code] || "").trim();
                  if (!note) return null;

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
                      <div style={{ fontWeight: 900, color: "#0b1220" }}>
                        {p.code} — {p.name}
                      </div>
                      <div style={{ marginTop: 8, color: "#0b1220", lineHeight: 1.4 }}>{note}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick wins */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0b1220" }}>
                Quick wins
              </h2>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Based on answers scored 0–1
              </div>
            </div>

            {quickWins.length === 0 ? (
              <div style={{ marginTop: 12, color: "#334155" }}>
                No quick wins were identified based on the 0–1 scores.
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {quickWins.slice(0, 10).map((w) => (
                  <div
                    key={w.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 14,
                      background: "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, color: "#0b1220" }}>
                          {w.recommendationTitle}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                          {w.id} ({w.pillar}) • Score: {w.score}
                        </div>
                        <div style={{ marginTop: 6, color: "#0b1220", lineHeight: 1.35 }}>
                          {w.whyItMatters}
                        </div>

                        <div style={{ marginTop: 10, color: "#0b1220" }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>Action steps</div>
                          <ul style={{ margin: "6px 0 0 18px", padding: 0, color: "#0b1220", lineHeight: 1.4 }}>
                            {Array.isArray(w.actionSteps) ? w.actionSteps.map((s: string, idx: number) => (
                              <li key={idx} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                                {s}
                              </li>
                            )) : null}
                          </ul>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, color: "#334155", lineHeight: 1.35 }}>
                          <strong>Related question:</strong> {w.questionText}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", minWidth: 120 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>{w.suggestedOwner}</div>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, marginTop: 4 }}>
                          Effort: {w.effort}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, marginTop: 4 }}>
                          Cost: {w.indicativeCost}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, marginTop: 4 }}>
                          Timeframe: {w.timeframe}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {quickWins.length > 10 && (
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    Showing 10 of {quickWins.length} quick wins.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer links */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link to="/start" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
            Back to start
          </Link>

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
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Reset this assessment
          </button>
        </div>
      </div>
    </div>
  );
}
