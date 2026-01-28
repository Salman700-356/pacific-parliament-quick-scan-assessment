export type Score = 0 | 1 | 2 | 3 | "NA";

export type SnapshotV1 = {
  token: string; // token string or "default"
  organisationName: string;
  country: string;
  contactEmail: string;
  timestampISO: string;
  totalScore24: number;
  band: string;
  pillarAverages: Array<{
    pillarCode: string;
    pillarName: string;
    averageScore: number;
    answeredCount: number;
    questionCount: number;
  }>;
  pillarNotes?: Record<string, string>;
  rawAnswers: Record<string, Score>;
};

export const PPQSA_SNAPSHOTS_V1_KEY = "ppqsa_snapshots_v1";

// Migration-only: old key used by earlier builds.
export const PPQSA_LEGACY_RESULTS_SNAPSHOTS_KEY = "ppqsa_results_snapshots_v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeScore(value: unknown): Score | undefined {
  if (value === "NA") return "NA";
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return undefined;
}

function normalizeRawAnswers(value: unknown): Record<string, Score> {
  if (!isRecord(value)) return {};

  const out: Record<string, Score> = {};
  for (const [key, v] of Object.entries(value)) {
    const score = normalizeScore(v);
    if (score === undefined) continue;
    out[key] = score;
  }
  return out;
}

function normalizePillarNotes(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

function normalizePillarAverages(value: unknown): SnapshotV1["pillarAverages"] {
  if (!Array.isArray(value)) return [];

  const out: SnapshotV1["pillarAverages"] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;

    out.push({
      pillarCode: readString(item["pillarCode"], ""),
      pillarName: readString(item["pillarName"], ""),
      averageScore: readNumber(item["averageScore"], 0),
      answeredCount: readNumber(item["answeredCount"], 0),
      questionCount: readNumber(item["questionCount"], 0),
    });
  }

  return out;
}

function normalizeSnapshotV1(value: unknown): SnapshotV1 | null {
  if (!isRecord(value)) return null;

  const tokenRaw = readString(value["token"], "").trim();
  const token = tokenRaw ? tokenRaw : "default";

  const organisationName = readString(value["organisationName"], "Not set");
  const country = readString(value["country"], "Not set");
  const contactEmail = readString(value["contactEmail"], "");

  const timestampISO = readString(value["timestampISO"], "").trim() || new Date().toISOString();
  const totalScore24 = readNumber(value["totalScore24"], 0);
  const band = readString(value["band"], "");

  const pillarAverages = normalizePillarAverages(value["pillarAverages"]);
  const rawAnswers = normalizeRawAnswers(value["rawAnswers"]);
  const pillarNotes = normalizePillarNotes(value["pillarNotes"]);

  return {
    token,
    organisationName,
    country,
    contactEmail,
    timestampISO,
    totalScore24,
    band,
    pillarAverages,
    pillarNotes,
    rawAnswers,
  };
}

export function readSnapshotsV1(): SnapshotV1[] {
  try {
    const raw = localStorage.getItem(PPQSA_SNAPSHOTS_V1_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: SnapshotV1[] = [];
    for (const item of parsed) {
      const normalized = normalizeSnapshotV1(item);
      if (!normalized) continue;
      out.push(normalized);
    }

    return out;
  } catch {
    return [];
  }
}

export function writeSnapshotsV1(snapshots: SnapshotV1[]) {
  localStorage.setItem(PPQSA_SNAPSHOTS_V1_KEY, JSON.stringify(snapshots));
}

export function appendSnapshotV1(snapshot: SnapshotV1): SnapshotV1[] {
  const current = readSnapshotsV1();
  const next = [...current, snapshot];
  writeSnapshotsV1(next);
  return next;
}

export function migrateLegacySnapshotsToV1() {
  try {
    const existing = localStorage.getItem(PPQSA_SNAPSHOTS_V1_KEY);
    if (existing && existing.trim() !== "") return;

    const legacyRaw = localStorage.getItem(PPQSA_LEGACY_RESULTS_SNAPSHOTS_KEY);
    if (!legacyRaw) return;

    const legacyParsed = JSON.parse(legacyRaw) as unknown;
    if (!Array.isArray(legacyParsed)) return;

    const migrated: SnapshotV1[] = [];

    for (const item of legacyParsed) {
      if (!isRecord(item)) continue;

      const tokenRaw = readString(item["token"], "").trim();
      const token = tokenRaw ? tokenRaw : "default";

      const profile = isRecord(item["profile"]) ? item["profile"] : null;
      const organisationName = readString(profile?.["organisationName"], "Not set");
      const country = readString(profile?.["country"], "Not set");
      const contactEmail = readString(profile?.["contactEmail"], "");

      const timestampISO = readString(item["timestamp"], "") || new Date().toISOString();
      const totalScore24 = readNumber(item["totalScoreOutOf24"], 0);
      const band = readString(item["maturityBand"], "");

      const pillarAverages = normalizePillarAverages(item["pillarAverages"]);
      const rawAnswers = normalizeRawAnswers(item["answers"]);

      migrated.push({
        token,
        organisationName,
        country,
        contactEmail,
        timestampISO,
        totalScore24,
        band,
        pillarAverages,
        rawAnswers,
      });
    }

    if (migrated.length === 0) return;
    localStorage.setItem(PPQSA_SNAPSHOTS_V1_KEY, JSON.stringify(migrated));
  } catch {
    // ignore
  }
}
