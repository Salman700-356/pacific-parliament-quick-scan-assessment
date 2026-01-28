import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { readSnapshotsV1, type SnapshotV1 } from "../utils/snapshots";

function parseTime(value: string): number {
  const t = Date.parse(value);
  return Number.isNaN(t) ? -1 : t;
}

function formatDate(value: string): string {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return value;
  return new Date(t).toLocaleString();
}

function sparklineAscii(values: number[]): string {
  if (values.length === 0) return "";

  const levels = " .:-=+*#%@"; // 10 levels, ASCII-only
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  if (min === max) {
    const idx = Math.floor((levels.length - 1) / 2);
    return values.map(() => levels[idx]).join("");
  }

  const scale = (levels.length - 1) / (max - min);
  return values
    .map((v) => {
      const n = Math.max(0, Math.min(levels.length - 1, Math.round((v - min) * scale)));
      return levels[n];
    })
    .join("");
}

type ParliamentOption = {
  token: string;
  label: string;
};

export default function TrendsPage() {
  const [selectedToken, setSelectedToken] = useState<string>("default");

  const { allSnapshots, tokens } = useMemo(() => {
    const allSnapshots = readSnapshotsV1();

    const byToken = new Map<string, SnapshotV1[]>();
    for (const s of allSnapshots) {
      const token = (s.token || "default").trim() || "default";
      const list = byToken.get(token) ?? [];
      list.push(s);
      byToken.set(token, list);
    }

    const options: ParliamentOption[] = [];

    for (const [token, list] of byToken.entries()) {
      const latest = [...list].sort((a, b) => parseTime(b.timestampISO) - parseTime(a.timestampISO))[0];
      const org = latest?.organisationName?.trim() || "Not set";
      const country = latest?.country?.trim() || "Not set";
      options.push({
        token,
        label: `${org} — ${country} (${token})`,
      });
    }

    options.sort((a, b) => a.label.localeCompare(b.label));

    return { allSnapshots, tokens: options };
  }, []);

  const effectiveToken = useMemo(() => {
    if (tokens.length === 0) return "default";
    const found = tokens.some((t) => t.token === selectedToken);
    return found ? selectedToken : tokens[0].token;
  }, [tokens, selectedToken]);

  const snapshotsForTokenOldestFirst = useMemo(() => {
    const token = effectiveToken;
    const filtered = allSnapshots.filter((s) => (s.token || "default") === token);

    return [...filtered].sort((a, b) => {
      const at = parseTime(a.timestampISO);
      const bt = parseTime(b.timestampISO);
      if (at === -1 && bt === -1) return a.timestampISO.localeCompare(b.timestampISO);
      if (at === -1) return -1;
      if (bt === -1) return 1;
      return at - bt;
    });
  }, [allSnapshots, effectiveToken]);

  const spark = useMemo(() => {
    const values = snapshotsForTokenOldestFirst.map((s) => Number(s.totalScore24)).filter((n) => Number.isFinite(n));
    return sparklineAscii(values);
  }, [snapshotsForTokenOldestFirst]);

  const selectedMeta = useMemo(() => {
    const latest = [...snapshotsForTokenOldestFirst].sort((a, b) => parseTime(b.timestampISO) - parseTime(a.timestampISO))[0];
    return {
      org: latest?.organisationName?.trim() || "Not set",
      country: latest?.country?.trim() || "Not set",
    };
  }, [snapshotsForTokenOldestFirst]);

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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "white", fontSize: 40, letterSpacing: -0.5 }}>Trends</h1>
            <p style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 16, maxWidth: 920 }}>
              Snapshot timeline for a selected parliament (assessment ID / token).
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
            <Link
              to={effectiveToken ? `/results/${effectiveToken}` : "/start?inviteRequired=1"}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Results
            </Link>
            <Link
              to="/admin"
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Admin
            </Link>
          </div>
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
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>Select parliament</div>
              <select
                value={effectiveToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                disabled={tokens.length === 0}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  fontWeight: 900,
                  color: "#0b1220",
                  minWidth: 320,
                }}
              >
                {tokens.map((t) => (
                  <option key={t.token} value={t.token}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 13, color: "#334155", fontWeight: 900 }}>
              {selectedMeta.org} — {selectedMeta.country}
            </div>
          </div>

          {allSnapshots.length === 0 ? (
            <div style={{ marginTop: 12, color: "#334155" }}>No snapshots found in localStorage.</div>
          ) : snapshotsForTokenOldestFirst.length === 0 ? (
            <div style={{ marginTop: 12, color: "#334155" }}>No snapshots for the selected parliament.</div>
          ) : (
            <>
              <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0b1220" }}>Trend (oldest → newest)</div>
                <pre
                  style={{
                    margin: 0,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontWeight: 900,
                    letterSpacing: 1,
                    color: "#0b1220",
                    overflowX: "auto",
                  }}
                >
                  {spark}
                </pre>
              </div>

              <div style={{ marginTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                        Date
                      </th>
                      <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                        Total score (/24)
                      </th>
                      <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid #e2e8f0" }}>
                        Band
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshotsForTokenOldestFirst.map((s) => (
                      <tr key={`${s.token}-${s.timestampISO}`}
                        style={{
                          background: "transparent",
                        }}
                      >
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {formatDate(s.timestampISO)}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {Number(s.totalScore24).toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", color: "#0b1220", fontWeight: 900 }}>
                          {s.band}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
