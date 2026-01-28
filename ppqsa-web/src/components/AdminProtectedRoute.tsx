import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminAuthed, isAdminGateEnabled } from "../utils/adminAuth";

export default function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!isAdminGateEnabled()) return <>{children}</>;

  if (!isAdminAuthed()) {
    const next = location.pathname + location.search + location.hash;
    return <Navigate to={`/admin-login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}
