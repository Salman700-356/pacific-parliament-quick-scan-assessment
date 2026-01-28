import { type ReactNode, useEffect } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

const TOKEN_KEY = "ppqsa_token_v1";

export default function TokenProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const params = useParams<{ token?: string }>();

  const token = params.token;

  useEffect(() => {
    if (token) {
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch {
        // ignore
      }
    }
  }, [token]);

  if (!token) {
    const next = location.pathname + location.search + location.hash;
    return <Navigate to={`/start?inviteRequired=1&next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}
