import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TOKEN_KEY = "ppqsa_token_v1";
const ADMIN_SESSION_KEY = "ppqsa_admin_authed_v1";
const TARGET_PILLAR_KEY = "ppqsa_target_pillar_v1";

const WARNING_DELAY_MS = 30 * 60 * 1000;
const EXPIRY_DELAY_MS = 40 * 60 * 1000;

function clearSessionFlags() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(TARGET_PILLAR_KEY);
  } catch {
    // ignore
  }
}

export default function SessionTimer() {
  const nav = useNavigate();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimerRef = useRef<number | null>(null);
  const expiryTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) window.clearTimeout(expiryTimerRef.current);
    warningTimerRef.current = null;
    expiryTimerRef.current = null;
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    warningTimerRef.current = window.setTimeout(() => {
      setShowWarning(true);
    }, WARNING_DELAY_MS);

    expiryTimerRef.current = window.setTimeout(() => {
      const token = sessionStorage.getItem(TOKEN_KEY) ?? undefined;
      clearSessionFlags();
      nav(token ? `/start/${token}` : "/start");
    }, EXPIRY_DELAY_MS);
  }, [clearTimers, nav]);

  const markActivity = useCallback(() => {
    setShowWarning(false);
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    scheduleTimers();

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      clearTimers();
    };
  }, [clearTimers, markActivity, scheduleTimers]);

  useEffect(() => {
    markActivity();
  }, [location.pathname, location.search, location.hash, markActivity]);

  if (!showWarning) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        padding: "10px 16px",
        background: "#fff7ed",
        borderBottom: "1px solid #fed7aa",
        color: "#9a3412",
        fontWeight: 900,
        textAlign: "center",
        fontSize: 14,
      }}
    >
      Session expiring soon
    </div>
  );
}
