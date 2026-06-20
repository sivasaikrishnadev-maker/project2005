import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const LEVEL_COLOR = { Expert: 'text-green-600', Strong: 'text-blue-600', Intermediate: 'text-yellow-600', Beginner: 'text-gray-500' };

export default function RoleSuggestions() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get(`/roles/suggest/${resumeId}`), api.get(`/skills/${resumeId}`)])
      .then(([r, s]) => { setRoles(r.data.suggestedRoles || []); setProfile(s.data.profile); })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load roles'))
      .finally(() => setLoading(false));
  }, [resumeId]);

  const selectRole = async (role) => {
    setSelecting(role.id);
    try {
      const { data } = await api.post('/roles/select', {
        resumeId,
        skillProfileId: profile?._id,
        selectedRole: role.id,
        suggestedRoles: roles.map((r) => r.id),
      });
      navigate(`/questions/${data.session._id}`, { state: { resumeId, session: data.session } });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to select role');
    } finally { setSelecting(null); }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading role suggestions…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Suggested Roles</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Select a role to start your personalised interview session.</p>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{role.title}</h2>
                  <span className={`text-sm font-medium ${LEVEL_COLOR[role.readinessLevel] || 'text-gray-500'}`}>{role.readinessLevel}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{role.description}</p>

                {/* Score bar */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${role.score}%` }} />
                  </div>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 w-12 text-right">{role.score}%</span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {role.coreMatched.length > 0 && (
                    <span>✅ <strong>{role.coreMatched.length}</strong> core skills matched: {role.coreMatched.slice(0, 4).join(', ')}</span>
                  )}
                  {role.coreMissing.length > 0 && (
                    <span>❌ Missing: {role.coreMissing.slice(0, 3).join(', ')}</span>
                  )}
                </div>
              </div>

              <button onClick={() => selectRole(role)} disabled={selecting === role.id}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition-colors whitespace-nowrap">
                {selecting === role.id ? 'Starting…' : 'Start Interview'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
