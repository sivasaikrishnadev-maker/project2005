import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, color }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm`}>
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/resume'),
      api.get('/sessions'),
      api.get('/analytics/me'),
    ]).then(([r, s, a]) => {
      setResumes(r.data.resumes || []);
      setSessions(s.data.sessions || []);
      setAnalytics(a.data.analytics);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const completed = sessions.filter((s) => s.status === 'completed').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your interview prep overview.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Resumes" value={resumes.length} color="text-indigo-600 dark:text-indigo-400" />
            <StatCard label="Sessions" value={sessions.length} color="text-purple-600 dark:text-purple-400" />
            <StatCard label="Completed" value={completed} color="text-green-600 dark:text-green-400" />
            <StatCard label="Readiness" value={analytics ? `${analytics.readinessScore}%` : '—'} color="text-orange-500" />
          </div>

          {/* Quick actions */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { to: '/resume', icon: '📄', label: 'Upload Resume', desc: 'Start by uploading your resume' },
              { to: '/analytics/readiness', icon: '📊', label: 'View Analytics', desc: 'Check your readiness score' },
              { to: '/analytics/trends', icon: '📈', label: 'Performance Trends', desc: 'Track improvement over time' },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow flex gap-4 items-start">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{a.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent resumes */}
          {resumes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Resumes</h2>
              <div className="space-y-3">
                {resumes.slice(0, 3).map((r) => (
                  <div key={r._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.originalName}</p>
                      <p className="text-xs text-gray-400">{r.fileType.toUpperCase()} · {r.parseStatus}</p>
                    </div>
                    <Link to={`/skills/${r._id}`} className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900">
                      View Skills →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Sessions</h2>
              <div className="space-y-3">
                {sessions.slice(0, 3).map((s) => (
                  <div key={s._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.selectedRole || 'General'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'}`}>{s.status}</span>
                    </div>
                    <Link to={`/review/${s._id}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Review →</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resumes.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No resume uploaded yet.</p>
              <Link to="/resume" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors inline-block">Upload Resume</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
