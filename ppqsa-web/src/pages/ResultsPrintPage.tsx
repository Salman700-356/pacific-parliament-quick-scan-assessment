import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { QUESTIONS, PILLARS } from "../data/questionBank";
import { QUICK_WINS_LIBRARY } from "../data/quickWinsLibrary";

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
const TARGET_SCORE_KEY = "ppqsa_target_score24_v1";

function storageKey(base: string, token?: string) {
  return token ? `${base}_${token}` : base;
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

function calcPillarScores(answers: Record<string, Score>) {
  const pillarMap = new Map<string, { code: string; name: string; avg: number; answered: number; total: number }>();

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
  const total = pillarScores.reduce((acc, p) => acc + p.avg, 0);
  return Number(total.toFixed(2));
}

function buildQuickWins(answers: Record<string, Score>) {
  return QUESTIONS.flatMap((q) => {
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
}

export default function ResultsPrintPage() {
  const params = useParams<{ token?: string }>();
  const token = params.token ?? undefined;

  const targetScore24 = useMemo(() => loadTargetScore24(), []);

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

  const { pillarScoresSorted, total24, band, quickWins } = useMemo(() => {
    const pillarScores = calcPillarScores(answers);
    const total24 = calcTotalScore24(pillarScores);
    const band = maturityBand(total24);
    const quickWins = buildQuickWins(answers);

    const pillarScoresSorted = [...pillarScores].sort((a, b) => a.code.localeCompare(b.code));
    return { pillarScoresSorted, total24, band, quickWins };
  }, [answers]);

  const answeredCount = useMemo(() => {
    const keys = Object.keys(answers);
    return keys.filter((qid) => QUESTIONS.some((q) => q.id === qid)).length;
  }, [answers]);

  useEffect(() => {
    // Print immediately on load for a one-click “Print / Save PDF” flow.
    window.setTimeout(() => window.print(), 0);
  }, []);

  const capturedAt = useMemo(() => new Date().toLocaleString(), []);

  return (
    <div style={{ background: "#ffffff", color: "#0b1220", minHeight: "100vh", fontFamily: "system-ui" }}>
      <style>
        {`@media print {
  @page { margin: 14mm; }
  a { color: #0b1220; text-decoration: none; }
  .no-print { display: none !important; }
  .card { break-inside: avoid; }
}`}
      </style>

      <div style={{ width: "min(980px, 100%)", margin: "0 auto", padding: "18px 16px" }}>
        <div className="no-print" style={{ marginBottom: 12 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              cursor: "pointer",
              fontWeight: 900,
              color: "#0b1220",
            }}
          >
            Print
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.3 }}>Results</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: "#334155", fontWeight: 800 }}>
              Captured: {capturedAt}
            </div>
          </div>

          <div style={{ textAlign: "right", minWidth: 260 }}>
            <div style={{ fontSize: 13, color: "#334155", fontWeight: 800 }}>Assessment ID</div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{token || "Not set"}</div>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: 14,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Organisation</div>
                <div style={{ fontWeight: 900 }}>{profile?.organisationName || "Not set"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Country</div>
                <div style={{ fontWeight: 900 }}>{profile?.country || "Not set"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Contact</div>
                <div style={{ fontWeight: 900 }}>
                  {profile?.contactName || "Not set"} ({profile?.contactEmail || "Not set"})
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Role</div>
                <div style={{ fontWeight: 900 }}>{profile?.roleTitle || "Not set"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Team size</div>
                <div style={{ fontWeight: 900 }}>{profile?.ictTeamSize || "Not set"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Answered</div>
                <div style={{ fontWeight: 900 }}>
                  {answeredCount} / {QUESTIONS.length}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Total score</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{total24} / 24</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#334155", fontWeight: 800 }}>
                  Target: {targetScore24} / 24
                </div>
              </div>
              <div style={{ minWidth: 260 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Maturity band</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{band}</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: 14,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Pillar breakdown</h2>
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 6px", fontWeight: 900, color: "#0b1220" }}>Pillar</th>
                  <th style={{ padding: "8px 6px", fontWeight: 900, color: "#0b1220" }}>Average / 3</th>
                  <th style={{ padding: "8px 6px", fontWeight: 900, color: "#0b1220" }}>Answered</th>
                </tr>
              </thead>
              <tbody>
                {pillarScoresSorted.map((p) => (
                  <tr key={p.code} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 800 }}>
                      {p.code} — {p.name}
                    </td>
                    <td style={{ padding: "8px 6px", fontWeight: 800 }}>{p.avg.toFixed(2)}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 800 }}>
                      {p.answered} / {p.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: 14,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Quick wins</h2>
          <div style={{ marginTop: 8, fontSize: 13, color: "#334155" }}>
            Based on answers scored 0–1.
          </div>

          {quickWins.length === 0 ? (
            <div style={{ marginTop: 10, color: "#334155" }}>No quick wins were identified based on the 0–1 scores.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {quickWins.map((w) => (
                <div key={w.id} style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                  <div style={{ fontWeight: 900 }}>{w.recommendationTitle}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#334155" }}>{w.whyItMatters}</div>
                  {Array.isArray(w.actionSteps) && w.actionSteps.length > 0 ? (
                    <ul style={{ margin: "8px 0 0 18px", padding: 0, fontSize: 12, color: "#0b1220" }}>
                      {w.actionSteps.map((s, idx) => (
                        <li key={idx} style={{ marginTop: idx === 0 ? 0 : 4 }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    {w.id} ({w.pillar}) • Owner: {w.suggestedOwner} • Effort: {w.effort} • Cost: {w.indicativeCost} • Timeframe: {w.timeframe}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#334155" }}>
                    <strong>Related question:</strong> {w.questionText}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: "#64748b" }}>
          Printer-friendly view. For best results, disable background graphics in print settings.
        </div>
      </div>
    </div>
  );
}
