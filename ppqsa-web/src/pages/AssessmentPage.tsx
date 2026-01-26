import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Score = 0 | 1 | 2 | 3 | "NA";

type Question = {
  id: string;
  pillar: string;
  text: string;
};

const QUESTIONS: Question[] = [
  { id: "GOV-01", pillar: "GOV", text: "Is there a named person/team accountable for cyber security?" },
  { id: "GOV-02", pillar: "GOV", text: "Does cyber risk get reported to leadership at least quarterly?" },
  { id: "IAM-01", pillar: "IAM", text: "Is MFA enabled for email and remote access for all staff?" },
  { id: "BAK-02", pillar: "BAK", text: "Are restores tested at least annually (or more often)?" },
];

export default function AssessmentPage() {
  const nav = useNavigate();

  const pillars = useMemo(() => {
    return Array.from(new Set(QUESTIONS.map((q) => q.pillar)));
  }, []);

  const [pillarIndex, setPillarIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Score>>({});

  const activePillar = pillars[pillarIndex];
  const pillarQuestions = QUESTIONS.filter((q) => q.pillar === activePillar);

  const setScore = (qid: string, score: Score) => {
    setAnswers((prev) => ({ ...prev, [qid]: score }));
  };

  const canContinue = pillarQuestions.every((q) => answers[q.id] !== undefined);

  const next = () => {
    if (pillarIndex < pillars.length - 1) {
      setPillarIndex((x) => x + 1);
    } else {
      // Store answers in session storage for demo
      sessionStorage.setItem("ppqsa_answers", JSON.stringify(answers));
      nav("/results");
    }
  };

  const back = () => {
    if (pillarIndex > 0) setPillarIndex((x) => x - 1);
    else nav("/start");
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Assessment Wizard</h1>
      <p style={{ opacity: 0.85 }}>
        Pillar {pillarIndex + 1} of {pillars.length}: <strong>{activePillar}</strong>
      </p>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        {pillarQuestions.map((q) => (
          <div key={q.id} style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 600 }}>{q.id}</div>
            <div style={{ marginTop: 6 }}>{q.text}</div>

            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(q.id, n as Score)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: answers[q.id] === n ? "2px solid black" : "1px solid #ccc",
                    background: "white",
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setScore(q.id, "NA")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: answers[q.id] === "NA" ? "2px solid black" : "1px solid #ccc",
                  background: "white",
                }}
              >
                N/A
              </button>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button onClick={back} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Back
          </button>

          <button
            onClick={next}
            disabled={!canContinue}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              opacity: canContinue ? 1 : 0.4,
            }}
          >
            {pillarIndex < pillars.length - 1 ? "Next" : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}
