import { Link, useParams } from "react-router-dom";

type StepKey = "profile" | "assessment" | "review" | "results";

type Step = {
  key: StepKey;
  label: string;
  buildTo: (token: string) => string;
};

const STEPS: Step[] = [
  { key: "profile", label: "Profile", buildTo: (token) => `/profile/${token}` },
  { key: "assessment", label: "Assessment", buildTo: (token) => `/assessment/${token}` },
  { key: "review", label: "Review", buildTo: (token) => `/review/${token}` },
  { key: "results", label: "Results", buildTo: (token) => `/results/${token}` },
];

export default function TopHeader({ current }: { current: StepKey }) {
  const params = useParams<{ token?: string }>();
  const token = params.token;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "10px 12px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Link
        to={token ? `/start/${token}` : "/start"}
        style={{
          color: "rgba(255,255,255,0.92)",
          fontWeight: 900,
          letterSpacing: -0.2,
          textDecoration: "none",
          lineHeight: 1.2,
        }}
      >
        Pacific Parliament Quick Scan Assessment
      </Link>

      <div
        aria-label="Assessment steps"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
          marginLeft: "auto",
          color: "rgba(255,255,255,0.75)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {STEPS.map((step, idx) => {
          const active = step.key === current;
          const isFuture = STEPS.findIndex((s) => s.key === current) < idx;
          const to = token ? step.buildTo(token) : "/start?inviteRequired=1";

          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                to={to}
                aria-current={active ? "step" : undefined}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: active ? "1px solid rgba(255,255,255,0.70)" : "1px solid rgba(255,255,255,0.18)",
                  background: active ? "rgba(255,255,255,0.16)" : "transparent",
                  color: active
                    ? "rgba(255,255,255,0.95)"
                    : isFuture
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(255,255,255,0.78)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </Link>

              {idx < STEPS.length - 1 && (
                <span aria-hidden="true" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 900 }}>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
