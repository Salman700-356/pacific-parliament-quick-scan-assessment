import { useCallback, useEffect, useMemo, useState } from "react";
import { PILLARS, QUESTIONS } from "../data/questionBank";
import { readSnapshotsV1, type SnapshotV1 } from "../utils/snapshots";

type SortKey = "date" | "score";

type SortDir = "asc" | "desc";

const TARGET_KEY = "ppqsa_target_v1";
const INVITES_KEY = "ppqsa_invites_v1";

type Invite = {
  token: string;
  label: string;
  createdAt: string;
  status: "active" | "revoked";
};

function generateToken(length: number = 14): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

function loadInvites(): Invite[] {
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Invite =>
        typeof item === "object" &&
        item !== null &&
        typeof item.token === "string" &&
        typeof item.label === "string" &&
        typeof item.createdAt === "string" &&
        (item.status === "active" || item.status === "revoked")
    );
  } catch {
    return [];
  }
}

function saveInvites(invites: Invite[]): void {
  try {
    localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
  } catch {
    // ignore
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function loadTarget24(): number {
  try {
    const raw = localStorage.getItem(TARGET_KEY);
    if (raw === null || raw.trim() === "") return 18;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 18;
    return clamp(value, 0, 24);
  } catch {
    return 18;
  }
}

type Row = {
  tokenKey: string;
  organisationName: string;
  country: string;
  latestScoreOutOf24: number;
  maturityBand: string;
  capturedAt: string;
  pillarAverages?: SnapshotV1["pillarAverages"];
  rawAnswers: SnapshotV1["rawAnswers"];
};

function safeParseSnapshots(): SnapshotV1[] {
  return readSnapshotsV1();
}

function parseTime(value: string): number {
  const t = Date.parse(value);
  return Number.isNaN(t) ? -1 : t;
}

function compareDesc(a: number, b: number) {
  return b - a;
}

function compareAsc(a: number, b: number) {
  return a - b;
}

function csvEscape(value: string) {
  if (/[^\S\r\n]|[\n\r",]/.test(value)) {
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

const PROFILE_BASE_KEY = "ppqsa_profile_v1";
const ANSWERS_BASE_KEY = "ppqsa_answers_v1";

type LifecycleStatus = "Not started" | "In progress" | "Completed";

function getInviteLifecycleStatus(token: string, snapshots: SnapshotV1[]): LifecycleStatus {
  // Check if any snapshot exists for this token
  const hasSnapshot = snapshots.some((s) => s.token === token);
  if (hasSnapshot) return "Completed";

  // Check if profile data exists for this token
  const profileKey = `${PROFILE_BASE_KEY}_${token}`;
  const answersKey = `${ANSWERS_BASE_KEY}_${token}`;
  
  try {
    const profileData = localStorage.getItem(profileKey);
    const answersData = localStorage.getItem(answersKey);
    
    // Check if profile has meaningful data
    if (profileData) {
      const profile = JSON.parse(profileData);
      if (profile && typeof profile === "object") {
        const hasProfileData = Object.values(profile).some(
          (v) => typeof v === "string" && v.trim() !== ""
        );
        if (hasProfileData) return "In progress";
      }
    }
    
    // Check if answers have been started
    if (answersData) {
      const answers = JSON.parse(answersData);
      if (answers && typeof answers === "object") {
        const answerObj = answers.answers || answers;
        if (Object.keys(answerObj).length > 0) return "In progress";
      }
    }
  } catch {
    // Ignore parse errors
  }

  return "Not started";
}

export default function AdminDashboard() {
  const [countryFilter, setCountryFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [target24, setTarget24] = useState<number>(() => loadTarget24());
  const [invites, setInvites] = useState<Invite[]>(() => loadInvites());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    saveInvites(invites);
  }, [invites]);

  useEffect(() => {
    try {
      localStorage.setItem(TARGET_KEY, String(clamp(target24, 0, 24)));
    } catch {
      // ignore
    }
  }, [target24]);

  const rows = useMemo<Row[]>(() => {
    const snapshots = safeParseSnapshots();

    // Latest snapshot per token (or per anonymous bucket)
    const latestByToken = new Map<string, SnapshotV1>();

    for (const s of snapshots) {
      const tokenKey = s.token || "default";
      const current = latestByToken.get(tokenKey);
      if (!current) {
        latestByToken.set(tokenKey, s);
        continue;
      }

      const tNew = parseTime(s.timestampISO);
      const tOld = parseTime(current.timestampISO);

      if (tNew === -1 && tOld === -1) {
        if (s.timestampISO > current.timestampISO) latestByToken.set(tokenKey, s);
        continue;
      }

      if (tNew > tOld) latestByToken.set(tokenKey, s);
    }

    return Array.from(latestByToken.entries()).map(([tokenKey, s]) => {
      const organisationName = s.organisationName?.trim() || "Not set";
      const country = s.country?.trim() || "Not set";

      return {
        tokenKey,
        organisationName,
        country,
        latestScoreOutOf24: s.totalScore24,
        maturityBand: s.band,
        capturedAt: s.timestampISO,
        pillarAverages: s.pillarAverages,
        rawAnswers: s.rawAnswers,
      };
    });
  }, []);

  // All snapshots for lifecycle status checking
  const allSnapshots = useMemo(() => safeParseSnapshots(), []);

  const pillarOrder = useMemo(() => PILLARS.map((p) => p.code), []);

  const insights = useMemo(() => {
    const latestSnapshots = rows;

    // (1) Weakest pillar across all parliaments (lowest average of averages).
    const pillarTotals = new Map<string, { sum: number; count: number }>();
    for (const p of pillarOrder) pillarTotals.set(p, { sum: 0, count: 0 });

    for (const r of latestSnapshots) {
      for (const p of r.pillarAverages ?? []) {
        const entry = pillarTotals.get(p.pillarCode);
        if (!entry) continue;
        const score = Number(p.averageScore);
        if (!Number.isFinite(score)) continue;
        entry.sum += score;
        entry.count += 1;
      }
    }

    let weakest: { code: string; name: string; avg: number } | null = null;
    for (const p of PILLARS) {
      const entry = pillarTotals.get(p.code);
      if (!entry || entry.count === 0) continue;
      const avg = entry.sum / entry.count;
      if (!weakest || avg < weakest.avg) weakest = { code: p.code, name: p.name, avg };
    }

    // (2) Top 5 most common quick wins (score 0–1 most often)
    const quickWinCounts = new Map<string, number>();
    for (const r of latestSnapshots) {
      for (const [questionId, score] of Object.entries(r.rawAnswers ?? {})) {
        if (score !== 0 && score !== 1) continue;
        quickWinCounts.set(questionId, (quickWinCounts.get(questionId) ?? 0) + 1);
      }
    }

    const questionTextById = new Map(QUESTIONS.map((q) => [q.id, q.text] as const));
    const topQuickWins = [...quickWinCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        count,
        text: questionTextById.get(id) ?? "",
      }));

    // (3) Parliaments per maturity band
    const bandCounts = new Map<string, number>();
    for (const r of latestSnapshots) {
      const band = (r.maturityBand || "Unknown").trim() || "Unknown";
      bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
    }

    const bandOrder = ["Foundational", "Developing", "Established", "Mature", "Unknown"];
    const bands = bandOrder
      .filter((b) => bandCounts.has(b))
      .map((b) => ({ band: b, count: bandCounts.get(b) ?? 0 }));

    return {
      totalParliaments: latestSnapshots.length,
      weakestPillar: weakest,
      topQuickWins,
      bands,
    };
  }, [rows, pillarOrder]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.country && r.country !== "Not set") set.add(r.country);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredByCountry = countryFilter === "All" ? rows : rows.filter((r) => r.country === countryFilter);
    const filtered =
      q === ""
        ? filteredByCountry
        : filteredByCountry.filter((r) => {
            return (
              r.organisationName.toLowerCase().includes(q) ||
              r.country.toLowerCase().includes(q) ||
              r.tokenKey.toLowerCase().includes(q)
            );
          });

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "score") {
        const cmp = sortDir === "desc" ? compareDesc(a.latestScoreOutOf24, b.latestScoreOutOf24) : compareAsc(a.latestScoreOutOf24, b.latestScoreOutOf24);
        if (cmp !== 0) return cmp;
        // tiebreaker: newest first
        return compareDesc(parseTime(a.capturedAt), parseTime(b.capturedAt));
      }

      // sortKey === "date"
      const cmp = sortDir === "desc" ? compareDesc(parseTime(a.capturedAt), parseTime(b.capturedAt)) : compareAsc(parseTime(a.capturedAt), parseTime(b.capturedAt));
      if (cmp !== 0) return cmp;
      // tiebreaker: highest score
      return compareDesc(a.latestScoreOutOf24, b.latestScoreOutOf24);
    });

    return sorted;
  }, [rows, countryFilter, search, sortKey, sortDir]);

  const exportCsv = () => {
    const timestampISO = new Date().toISOString();
    const header = [
      "token",
      "organisationName",
      "country",
      ...pillarOrder,
      "totalScore24",
      "band",
      "timestampISO",
    ];

    const rowsOut = filteredAndSorted.map((r) => {
      const byCode = new Map<string, NonNullable<SnapshotV1["pillarAverages"]>[number]>();
      for (const p of r.pillarAverages ?? []) byCode.set(p.pillarCode, p);

      const pillarCells = pillarOrder.map((code) => {
        const score = byCode.get(code)?.averageScore;
        if (typeof score !== "number" || !Number.isFinite(score)) return "";
        return Number(score).toFixed(2);
      });

      return [
        r.tokenKey,
        r.organisationName,
        r.country,
        ...pillarCells,
        Number(r.latestScoreOutOf24).toFixed(2),
        r.maturityBand,
        r.capturedAt,
      ];
    });

    const csv = [header, ...rowsOut]
      .map((row) => row.map((cell) => csvEscape(String(cell ?? ""))).join(","))
      .join("\n");

    downloadBlob(`ppqsa-admin-latest-${timestampISO}.csv`, "text/csv;charset=utf-8", csv);
  };

  const exportJson = () => {
    const timestampISO = new Date().toISOString();
    const snapshots = readSnapshotsV1();
    downloadBlob(
      `ppqsa-admin-snapshots-${timestampISO}.json`,
      "application/json;charset=utf-8",
      JSON.stringify(snapshots, null, 2)
    );
  };

  const filteredCountLabel = useMemo(() => {
    const base = `${filteredAndSorted.length} record(s)`;
    const q = search.trim();
    return q ? `${base} (matching “${q}”)` : base;
  }, [filteredAndSorted.length, search]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "date" ? "desc" : "desc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const handleCreateInvite = useCallback(() => {
    const label = window.prompt("Enter a label for the invite (e.g., Fiji Parliament 2026):");
    if (!label || !label.trim()) return;

    const token = generateToken(14);
    const newInvite: Invite = {
      token,
      label: label.trim(),
      createdAt: new Date().toISOString(),
      status: "active",
    };

    setInvites((prev) => [newInvite, ...prev]);
  }, []);

  const handleRevokeInvite = useCallback((token: string) => {
    setInvites((prev) =>
      prev.map((inv) => (inv.token === token ? { ...inv, status: "revoked" } : inv))
    );
  }, []);

  const handleCopyLink = useCallback((token: string) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/start/${token}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }, []);

  const getFullStartUrl = useCallback((token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/start/${token}`;
  }, []);

  const handleRevokeAllInvites = useCallback(() => {
    if (!window.confirm("Are you sure you want to revoke ALL invites? This cannot be undone.")) return;
    setInvites((prev) => prev.map((inv) => ({ ...inv, status: "revoked" as const })));
  }, []);

  const handleDeleteAllInvites = useCallback(() => {
    if (!window.confirm("Are you sure you want to DELETE all invites? This will permanently remove all invite records.")) return;
    setInvites([]);
  }, []);

  const handleDeleteAllData = useCallback(() => {
    if (!window.confirm("⚠️ WARNING: This will delete ALL application data including invites, snapshots, profiles, and answers. This action cannot be undone!\n\nAre you sure you want to proceed?")) return;
    if (!window.confirm("This is your final confirmation. ALL DATA will be permanently deleted. Continue?")) return;
    
    // Clear all ppqsa-related localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ppqsa_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    
    // Reset local state
    setInvites([]);
    
    // Reload the page to reset all state
    window.location.reload();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        padding: "24px 16px",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ width: "min(1100px, 100%)", margin: "0 auto" }}>
        <h1 style={{ margin: 0, color: "white", fontSize: 40, letterSpacing: -0.5 }}>Admin dashboard</h1>
        <p style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 16, maxWidth: 920 }}>
          Aggregated snapshot view across all assessment IDs (tokens). This page is not authenticated yet.
        </p>

        <div
          style={{
            marginTop: 16,
            background: "#ffffff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900, color: "#0b1220" }}>{filteredCountLabel}</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>Search</div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Organisation, country, or assessment ID"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid #cbd5e1",
                    fontWeight: 900,
                    color: "#0b1220",
                    minWidth: 260,
                  }}
                />
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>Filter by country</div>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  fontWeight: 900,
                  color: "#0b1220",
                }}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>Target</div>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={24}
                  step={0.25}
                  value={target24}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next)) return;
                    setTarget24(clamp(next, 0, 24));
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
                <div style={{ fontSize: 13, fontWeight: 900, color: "#64748b" }}>/ 24</div>
              </div>

              <button
                onClick={exportCsv}
                disabled={filteredAndSorted.length === 0}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: filteredAndSorted.length === 0 ? "not-allowed" : "pointer",
                  opacity: filteredAndSorted.length === 0 ? 0.45 : 1,
                  fontWeight: 900,
                  color: "#0b1220",
                }}
              >
                Export CSV
              </button>

              <button
                onClick={exportJson}
                disabled={rows.length === 0}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: rows.length === 0 ? "not-allowed" : "pointer",
                  opacity: rows.length === 0 ? 0.45 : 1,
                  fontWeight: 900,
                  color: "#0b1220",
                }}
              >
                Export JSON
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div style={{ marginTop: 12, color: "#334155" }}>No snapshots found in localStorage.</div>
          ) : (
            <div style={{ marginTop: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Organisation
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Country
                    </th>
                    <th
                      style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}
                    >
                      Latest score (/24)
                      <button
                        onClick={() => toggleSort("score")}
                        style={{
                          marginLeft: 6,
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          borderRadius: 10,
                          padding: "2px 8px",
                          cursor: "pointer",
                          fontWeight: 900,
                          color: "#0b1220",
                        }}
                        aria-label="Sort by score"
                      >
                        Sort{sortIndicator("score")}
                      </button>
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Maturity band
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Token / Assessment ID
                    </th>
                    <th
                      style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}
                    >
                      Date captured
                      <button
                        onClick={() => toggleSort("date")}
                        style={{
                          marginLeft: 6,
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          borderRadius: 10,
                          padding: "2px 8px",
                          cursor: "pointer",
                          fontWeight: 900,
                          color: "#0b1220",
                        }}
                        aria-label="Sort by date"
                      >
                        Sort{sortIndicator("date")}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((r) => {
                    const date = (() => {
                      const t = Date.parse(r.capturedAt);
                      if (Number.isNaN(t)) return r.capturedAt;
                      return new Date(t).toLocaleString();
                    })();

                    return (
                      <tr key={r.tokenKey}>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {r.organisationName}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220" }}>{r.country}</td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          <div style={{ fontWeight: 900, color: "#0b1220" }}>{Number(r.latestScoreOutOf24).toFixed(2)}</div>
                          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 900, color: "#64748b", whiteSpace: "nowrap" }}>
                            {(() => {
                              const gap = Number(r.latestScoreOutOf24) - target24;
                              const gapLabel = `${gap >= 0 ? "+" : ""}${gap.toFixed(2)}`;
                              const gapColor = gap >= 0 ? "#16a34a" : "#dc2626";
                              return (
                                <span>
                                  Target {target24.toFixed(2)} · Gap <span style={{ color: gapColor }}>{gapLabel}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {r.maturityBand}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {r.tokenKey}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220" }}>{date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            background: "#ffffff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, color: "#0b1220" }}>Compare All Parliaments</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#334155", fontWeight: 800 }}>
                Matrix view of each parliament’s latest snapshot.
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#334155", fontWeight: 800 }}>Highlights lowest 2 pillar scores per row</div>
          </div>

          {filteredAndSorted.length === 0 ? (
            <div style={{ marginTop: 12, color: "#334155" }}>No rows to compare for the current filter.</div>
          ) : (
            <div style={{ marginTop: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Organisation
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Country
                    </th>
                    {pillarOrder.map((code) => (
                      <th
                        key={code}
                        style={{
                          textAlign: "left",
                          fontSize: 12,
                          color: "#64748b",
                          padding: "10px 8px",
                          borderBottom: "1px solid #e2e8f0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {code}
                      </th>
                    ))}
                    <th
                      style={{
                        textAlign: "left",
                        fontSize: 12,
                        color: "#64748b",
                        padding: "10px 8px",
                        borderBottom: "1px solid #e2e8f0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((r) => {
                    const byCode = new Map<string, NonNullable<SnapshotV1["pillarAverages"]>[number]>();
                    for (const p of r.pillarAverages ?? []) byCode.set(p.pillarCode, p);

                    const pillarScores = pillarOrder
                      .map((code) => ({ code, score: byCode.get(code)?.averageScore }))
                      .filter((x) => typeof x.score === "number" && Number.isFinite(x.score));

                    const lowestTwo = new Set(
                      [...pillarScores]
                        .sort((a, b) => (a.score as number) - (b.score as number))
                        .slice(0, 2)
                        .map((x) => x.code)
                    );

                    const cellStyle = (highlight: boolean): React.CSSProperties => ({
                      padding: "10px 8px",
                      borderBottom: "1px solid #f1f5f9",
                      color: "#0b1220",
                      fontWeight: 900,
                      background: highlight ? "#fee2e2" : undefined,
                      borderRadius: highlight ? 10 : undefined,
                    });

                    return (
                      <tr key={r.tokenKey}>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {r.organisationName}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {r.country}
                        </td>
                        {pillarOrder.map((code) => {
                          const p = byCode.get(code);
                          if (!p) {
                            return (
                              <td key={code} style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>
                                —
                              </td>
                            );
                          }

                          return (
                            <td key={code} style={cellStyle(lowestTwo.has(code))}>
                              {Number(p.averageScore).toFixed(2)}
                            </td>
                          );
                        })}
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {Number(r.latestScoreOutOf24).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            background: "#ffffff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, color: "#0b1220" }}>Insights</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#334155", fontWeight: 800 }}>
              Computed from the latest snapshot per parliament (assessment ID).
            </div>
          </div>

          {rows.length === 0 ? (
            <div style={{ marginTop: 12, color: "#334155" }}>No snapshots found to calculate insights.</div>
          ) : (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Weakest pillar (lowest average)</div>
                {insights.weakestPillar ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#0b1220" }}>
                      {insights.weakestPillar.code}
                      <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 800, color: "#334155" }}>
                        {insights.weakestPillar.name}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900, color: "#0b1220" }}>
                      Avg: {insights.weakestPillar.avg.toFixed(2)} / 3
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                      Based on {insights.totalParliaments} parliament(s)
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: "#334155" }}>Not enough data.</div>
                )}
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Top 5 most common quick wins</div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {insights.topQuickWins.length === 0 ? (
                    <div style={{ color: "#334155" }}>No quick wins detected yet.</div>
                  ) : (
                    insights.topQuickWins.map((q) => (
                      <div key={q.id} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                        <div style={{ minWidth: 74, fontWeight: 900, color: "#0b1220" }}>{q.id}</div>
                        <div style={{ fontSize: 13, color: "#334155", fontWeight: 800, lineHeight: 1.35, flex: 1 }}>
                          {q.text || "(Question text unavailable)"}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220", whiteSpace: "nowrap" }}>{q.count}×</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Parliaments per maturity band</div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {insights.bands.length === 0 ? (
                    <div style={{ color: "#334155" }}>No band data.</div>
                  ) : (
                    insights.bands.map((b) => (
                      <div key={b.band} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900, color: "#0b1220" }}>{b.band}</div>
                        <div style={{ fontWeight: 900, color: "#0b1220" }}>{b.count}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invite Management Section */}
        <div
          style={{
            marginTop: 16,
            background: "#ffffff",
            borderRadius: 20,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, color: "#0b1220" }}>Invite Management</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#334155", fontWeight: 800 }}>
                Create and manage magic links for assessment invites.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleCreateInvite}
                style={{
                  padding: "10px 18px",
                  borderRadius: 14,
                  border: "none",
                  background: "#0b1220",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                + Create New Invite
              </button>
              <button
                onClick={handleRevokeAllInvites}
                disabled={invites.length === 0 || invites.every((i) => i.status === "revoked")}
                style={{
                  padding: "10px 18px",
                  borderRadius: 14,
                  border: "1px solid #fca5a5",
                  background: "#ffffff",
                  color: "#dc2626",
                  cursor: invites.length === 0 || invites.every((i) => i.status === "revoked") ? "not-allowed" : "pointer",
                  opacity: invites.length === 0 || invites.every((i) => i.status === "revoked") ? 0.5 : 1,
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                Revoke All
              </button>
              <button
                onClick={handleDeleteAllInvites}
                disabled={invites.length === 0}
                style={{
                  padding: "10px 18px",
                  borderRadius: 14,
                  border: "1px solid #fca5a5",
                  background: "#fee2e2",
                  color: "#dc2626",
                  cursor: invites.length === 0 ? "not-allowed" : "pointer",
                  opacity: invites.length === 0 ? 0.5 : 1,
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                Delete All Invites
              </button>
              <button
                onClick={handleDeleteAllData}
                style={{
                  padding: "10px 18px",
                  borderRadius: 14,
                  border: "1px solid #7f1d1d",
                  background: "#7f1d1d",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                ⚠️ Delete All Data
              </button>
            </div>
          </div>

          {invites.length === 0 ? (
            <div style={{ marginTop: 14, color: "#334155" }}>No invites created yet. Click "Create New Invite" to generate a magic link.</div>
          ) : (
            <div style={{ marginTop: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Label
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Token
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Full Start URL
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Created Date
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Lifecycle
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => {
                    const createdDate = (() => {
                      const t = Date.parse(inv.createdAt);
                      if (Number.isNaN(t)) return inv.createdAt;
                      return new Date(t).toLocaleString();
                    })();

                    const fullUrl = getFullStartUrl(inv.token);
                    const isActive = inv.status === "active";
                    const lifecycleStatus = getInviteLifecycleStatus(inv.token, allSnapshots);
                    const lifecycleColors: Record<LifecycleStatus, { bg: string; text: string }> = {
                      "Not started": { bg: "#f1f5f9", text: "#64748b" },
                      "In progress": { bg: "#fef3c7", text: "#92400e" },
                      "Completed": { bg: "#dcfce7", text: "#166534" },
                    };

                    return (
                      <tr key={inv.token} style={{ opacity: isActive ? 1 : 0.6 }}>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {inv.label}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontFamily: "monospace", fontSize: 13 }}>
                          {inv.token}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontFamily: "monospace", fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                            {fullUrl}
                          </a>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220" }}>
                          {createdDate}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 900,
                              background: lifecycleColors[lifecycleStatus].bg,
                              color: lifecycleColors[lifecycleStatus].text,
                            }}
                          >
                            {lifecycleStatus}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 900,
                              background: isActive ? "#dcfce7" : "#fee2e2",
                              color: isActive ? "#166534" : "#991b1b",
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleCopyLink(inv.token)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 10,
                                border: "1px solid #cbd5e1",
                                background: copiedToken === inv.token ? "#dcfce7" : "#ffffff",
                                cursor: "pointer",
                                fontWeight: 900,
                                color: copiedToken === inv.token ? "#166534" : "#0b1220",
                                fontSize: 12,
                              }}
                            >
                              {copiedToken === inv.token ? "Copied!" : "Copy Link"}
                            </button>
                            {isActive && (
                              <button
                                onClick={() => handleRevokeInvite(inv.token)}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 10,
                                  border: "1px solid #fca5a5",
                                  background: "#ffffff",
                                  cursor: "pointer",
                                  fontWeight: 900,
                                  color: "#dc2626",
                                  fontSize: 12,
                                }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
