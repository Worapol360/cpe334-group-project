import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homeFor, useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import OwnerSurveys from './pages/OwnerSurveys.jsx';
import CreateSurvey from './pages/CreateSurvey.jsx';
import OwnerSurveyDetail from './pages/OwnerSurveyDetail.jsx';
import OwnerSurveySummary from './pages/OwnerSurveySummary.jsx';
import Surveys from './pages/Surveys.jsx';
import SurveyDetail from './pages/SurveyDetail.jsx';
import ResponseDetail from './pages/ResponseDetail.jsx';
import NotAllowed from './pages/NotAllowed.jsx';

function Loading() {
  return (
    <main data-testid="loading">Loading…</main>
  );
}

function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <NotAllowed />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeFor(user.role)} replace />;
}

function Footer() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.version) setVersion(data.version);
      })
      .catch(() => {});
  }, []);

  return (
    <footer data-testid="app-footer" style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
      FeedbackLoop • Lab 5 Release{version ? ` (${version})` : ''}
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/owner/surveys"
            element={
              <RequireAuth role="owner">
                <OwnerSurveys />
              </RequireAuth>
            }
          />
          <Route
            path="/owner/surveys/new"
            element={
              <RequireAuth role="owner">
                <CreateSurvey />
              </RequireAuth>
            }
          />
          <Route
            path="/owner/surveys/:id"
            element={
              <RequireAuth role="owner">
                <OwnerSurveyDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/owner/surveys/:id/summary"
            element={
              <RequireAuth role="owner">
                <OwnerSurveySummary />
              </RequireAuth>
            }
          />
          <Route
            path="/surveys"
            element={
              <RequireAuth role="respondent">
                <Surveys />
              </RequireAuth>
            }
          />
          <Route
            path="/surveys/:id"
            element={
              <RequireAuth role="respondent">
                <SurveyDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/responses/:id"
            element={
              <RequireAuth role="respondent">
                <ResponseDetail />
              </RequireAuth>
            }
          />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
