import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import SkillProfile from './pages/SkillProfile';
import RoleSuggestions from './pages/RoleSuggestions';
import QuestionBank from './pages/QuestionBank';
import InterviewSession from './pages/InterviewSession';
import AnswerReview from './pages/AnswerReview';
import AnalyticsReadiness from './pages/AnalyticsReadiness';
import AnalyticsTrends from './pages/AnalyticsTrends';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/resume" element={<ResumeUpload />} />
              <Route path="/skills/:resumeId" element={<SkillProfile />} />
              <Route path="/roles/:resumeId" element={<RoleSuggestions />} />
              <Route path="/questions/:sessionId" element={<QuestionBank />} />
              <Route path="/session/:sessionId" element={<InterviewSession />} />
              <Route path="/review/:sessionId" element={<AnswerReview />} />
              <Route path="/analytics/readiness" element={<AnalyticsReadiness />} />
              <Route path="/analytics/trends" element={<AnalyticsTrends />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
