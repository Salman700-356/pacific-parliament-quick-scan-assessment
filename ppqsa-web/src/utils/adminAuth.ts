const ADMIN_SESSION_KEY = "ppqsa_admin_authed_v1";

function readExpectedAdminCode(): string {
  const raw = import.meta.env.VITE_ADMIN_CODE;
  return typeof raw === "string" ? raw.trim() : "";
}

export function isAdminGateEnabled(): boolean {
  return readExpectedAdminCode() !== "";
}

export function isAdminAuthed(): boolean {
  try {
    if (!isAdminGateEnabled()) return true;
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function verifyAdminCode(input: string): boolean {
  const expected = readExpectedAdminCode();
  if (expected === "") return true;
  return input.trim() === expected;
}

export function setAdminAuthed(flag: boolean) {
  try {
    if (flag) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}
