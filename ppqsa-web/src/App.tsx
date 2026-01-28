import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StartPage from "./pages/StartPage";
import ProfilePage from "./pages/ProfilePage";
import AssessmentPage from "./pages/AssessmentPage";
import ReviewPage from "./pages/ReviewPage";
import ResultsPage from "./pages/ResultsPage";
import ResultsPrintPage from "./pages/ResultsPrintPage";
import AdminDashboard from "./pages/AdminDashboard";
import DemoAdminDashboard from "./pages/DemoAdminDashboard";
import TrendsPage from "./pages/TrendsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import TokenProtectedRoute from "./components/TokenProtectedRoute";
import SessionTimer from "./components/SessionTimer";

export default function App() {
  return (
    <BrowserRouter>
      <SessionTimer />
      <Routes>
        <Route path="/" element={<Navigate to="/start" replace />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/start/:token" element={<StartPage />} />
        <Route path="/profile" element={<Navigate to="/start?inviteRequired=1" replace />} />
        <Route
          path="/profile/:token"
          element={
            <TokenProtectedRoute>
              <ProfilePage />
            </TokenProtectedRoute>
          }
        />
        <Route path="/assessment" element={<Navigate to="/start?inviteRequired=1" replace />} />
        <Route
          path="/assessment/:token"
          element={
            <TokenProtectedRoute>
              <AssessmentPage />
            </TokenProtectedRoute>
          }
        />
        <Route path="/review" element={<Navigate to="/start?inviteRequired=1" replace />} />
        <Route
          path="/review/:token"
          element={
            <TokenProtectedRoute>
              <ReviewPage />
            </TokenProtectedRoute>
          }
        />
        <Route path="/results" element={<Navigate to="/start?inviteRequired=1" replace />} />
        <Route
          path="/results/:token"
          element={
            <TokenProtectedRoute>
              <ResultsPage />
            </TokenProtectedRoute>
          }
        />
        <Route path="/results/print" element={<Navigate to="/start?inviteRequired=1" replace />} />
        <Route
          path="/results/:token/print"
          element={
            <TokenProtectedRoute>
              <ResultsPrintPage />
            </TokenProtectedRoute>
          }
        />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <AdminProtectedRoute>
              <TrendsPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/demo-admin" element={<DemoAdminDashboard />} />
        <Route path="*" element={<Navigate to="/start" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
