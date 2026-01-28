import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopHeader from "../components/TopHeader";

const PROFILE_BASE_KEY = "ppqsa_profile_v1";
const TOKEN_KEY = "ppqsa_token_v1";

function storageKey(base: string, token?: string) {
  return token ? `${base}_${token}` : base;
}

type Profile = {
  organisationName: string;
  country: string;
  contactName: string;
  contactEmail: string;
  roleTitle: string;
  ictTeamSize: string;
  notes: string;
  token?: string;
};

function emptyProfile(): Profile {
  return {
    organisationName: "",
    country: "",
    contactName: "",
    contactEmail: "",
    roleTitle: "",
    ictTeamSize: "",
    notes: "",
  };
}

function loadProfile(currentToken?: string): Profile {
  try {
    const raw = localStorage.getItem(storageKey(PROFILE_BASE_KEY, currentToken));
    if (!raw) {
      // Migration: pull forward any old sessionStorage value.
      const legacy = sessionStorage.getItem(PROFILE_BASE_KEY);
      if (!legacy) return emptyProfile();

      const parsedLegacy = JSON.parse(legacy) as Profile;
      if (currentToken) {
        if (parsedLegacy.token !== currentToken) return emptyProfile();
      }

      localStorage.setItem(storageKey(PROFILE_BASE_KEY, currentToken), JSON.stringify(parsedLegacy));
      sessionStorage.removeItem(PROFILE_BASE_KEY);
      return parsedLegacy;
    }
    const parsed = JSON.parse(raw) as Profile;

    if (currentToken) {
      if (!parsed.token) return emptyProfile();
      if (parsed.token !== currentToken) return emptyProfile();
    }

    return parsed;
  } catch {
    return emptyProfile();
  }
}

function saveProfile(profile: Profile, currentToken?: string) {
  localStorage.setItem(storageKey(PROFILE_BASE_KEY, currentToken), JSON.stringify(profile));
}

export default function ProfilePage() {
  const nav = useNavigate();
  const params = useParams<{ token?: string }>();

  useEffect(() => {
    if (params.token) sessionStorage.setItem(TOKEN_KEY, params.token);
  }, [params.token]);

  const token = useMemo(() => params.token ?? undefined, [params.token]);

  const [profile, setProfile] = useState<Profile>(() => loadProfile(token));

  if (!token) return null;

  const isValidEmail = useMemo(() => {
    if (!profile.contactEmail.trim()) return false;
    return profile.contactEmail.includes("@") && profile.contactEmail.includes(".");
  }, [profile.contactEmail]);

  const canContinue = useMemo(() => {
    return (
      profile.organisationName.trim().length > 1 &&
      profile.country.trim().length > 1 &&
      profile.contactName.trim().length > 1 &&
      isValidEmail &&
      profile.roleTitle.trim().length > 1 &&
      profile.ictTeamSize.trim().length > 0
    );
  }, [profile, isValidEmail]);

  const update = (key: keyof Profile, value: string) => {
    const next = { ...profile, [key]: value, token };
    setProfile(next);
    saveProfile(next, token);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    fontSize: 15,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 900,
    color: "#0b1220",
    fontSize: 13,
    marginBottom: 6,
    display: "block",
  };

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
        <TopHeader current="profile" />

        <h1 style={{ marginTop: 16, marginBottom: 0, color: "white", fontSize: 40, letterSpacing: -0.5 }}>
          Organisation details
        </h1>
        <p style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 16, maxWidth: 760 }}>
          This information helps label your results correctly and track maturity over time.
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Parliament or organisation name</label>
              <input
                style={inputStyle}
                value={profile.organisationName}
                onChange={(e) => update("organisationName", e.target.value)}
                placeholder="e.g. Parliament of ..."
              />
            </div>

            <div>
              <label style={labelStyle}>Country</label>
              <input
                style={inputStyle}
                value={profile.country}
                onChange={(e) => update("country", e.target.value)}
                placeholder="e.g. Fiji"
              />
            </div>

            <div>
              <label style={labelStyle}>Primary contact name</label>
              <input
                style={inputStyle}
                value={profile.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div>
              <label style={labelStyle}>Primary contact email</label>
              <input
                style={inputStyle}
                value={profile.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                placeholder="name@example.org"
              />
              {!isValidEmail && profile.contactEmail.length > 0 && (
                <div style={{ fontSize: 13, marginTop: 6, color: "#b91c1c", fontWeight: 700 }}>
                  Please enter a valid email address.
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Role / title</label>
              <input
                style={inputStyle}
                value={profile.roleTitle}
                onChange={(e) => update("roleTitle", e.target.value)}
                placeholder="e.g. ICT Manager / Security Advisor"
              />
            </div>

            <div>
              <label style={labelStyle}>ICT/cyber team size</label>
              <select
                style={inputStyle}
                value={profile.ictTeamSize}
                onChange={(e) => update("ictTeamSize", e.target.value)}
              >
                <option value="">Select an option</option>
                <option value="1">1 (single person)</option>
                <option value="2-5">2–5</option>
                <option value="6-10">6–10</option>
                <option value="11-20">11–20</option>
                <option value="20+">20+</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                value={profile.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Any context you want to share (optional)"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 12 }}>
            <button
              onClick={() => nav(token ? `/start/${token}` : "/start")}
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
              onClick={() => nav(`/assessment/${token}`)}
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
              Continue to assessment
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, color: "rgba(255,255,255,0.65)", fontSize: 13, maxWidth: 820 }}>
          Privacy note: this assessment is intended for maturity benchmarking and improvement planning.
          Your information will be handled sensitively and used only for agreed reporting purposes.
        </div>
      </div>
    </div>
  );
}
