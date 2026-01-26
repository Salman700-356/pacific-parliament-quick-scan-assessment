import { useMemo } from "react";
import { Link } from "react-router-dom";

type Score = 0 | 1 | 2 | 3 | "NA";

function maturityBand(score24: number) {
  if (score24 < 6) return "Foundational";
  if (score24 < 12) return "Developing";
  if (score24 < 18) return "Established";
  return "Mature";
}

export default function ResultsPage() {
  const answers = useMemo(() => {
    const raw = sessionStorage.getItem("ppqsa_answers");
    return raw ? (JSON.parse(raw) as Record<string, Score>) : {};
  }, []);

  const { totalScore, band } = useMemo(() => {
    // demo: average of answered scores that aren't NA, then scale
    const scores = Object.values(answers).filter((x) => x !== "NA") as Array<0 | 1 | 2 | 3>;
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const score24 = avg * 8; // crude demo scaling
    return { totalScore: Number(score24.toFixed(2)), band: maturityBand(score24) };
  }, [answers]);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Results</h1>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Total Score: {totalScore} / 24</div>
        <div style={{ marginTop: 6, opacity: 0.85 }}>
          Maturity Band: <strong>{band}</strong>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link to="/start">Start again</Link>
      </div>
    </div>
  );
}
