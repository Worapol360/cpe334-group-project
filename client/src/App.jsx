import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homeFor, useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import OwnerSurveys from './pages/OwnerSurveys.jsx';
import CreateSurvey from './pages/CreateSurvey.jsx';
import OwnerSurveyDetail from './pages/OwnerSurveyDetail.jsx';
import Surveys from './pages/Surveys.jsx';
import SurveyDetail from './pages/SurveyDetail.jsx';
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
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
