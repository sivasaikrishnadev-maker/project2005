import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const CATEGORY_COLORS = {
  languages: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  frontend:  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  backend:   'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  databases: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  cloud:     'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  tools:     'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  aiml:      'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
};
const CATS = Object.keys(CATEGORY_COLORS);

export default function SkillProfile() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/skills/${resumeId}`)
      .then((r) => setProfile(r.data.profile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [resumeId]);

  const runExtraction = async () => {
    setExtracting(true); setError('');
    try {
      const { data } = await api.post(`/skills/extract/${resumeId}`);
      setProfile(data.profile);
    } catch (err) {
      setError(err.response?.data?.message || 'Extraction failed');
    } finally { setExtracting(false); }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skill Profile</h1>
          {profile && <p className="text-gray-500 dark:text-gray-400 mt-1">{profile.allSkills?.length} skills detected</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={runExtraction} disabled={extracting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition-colors">
            {extracting ? 'Extracting…' : profile ? 'Re-Extract' : 'Extract Skills'}
          </button>
          {profile && (
            <button onClick={() => navigate(`/roles/${resumeId}`)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors">
              Suggest Roles →
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {!profile ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-gray-600 dark:text-gray-400">Click "Extract Skills" to analyse your resume.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {CATS.map((cat) => {
            const skills = profile[cat] || [];
            if (skills.length === 0) return null;
            return (
              <div key={cat} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 capitalize mb-3 flex items-center gap-2">
                  {cat} <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{skills.length}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span key={s.name} title={`source: ${s.source}`}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[cat]}`}>
                      {s.name} {s.source === 'both' ? '⭐' : s.source === 'description' ? '·' : ''}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {profile && (
        <p className="text-xs text-gray-400 mt-4">⭐ = found in skills section AND descriptions · · = inferred from descriptions</p>
      )}
    </div>
  );
}
