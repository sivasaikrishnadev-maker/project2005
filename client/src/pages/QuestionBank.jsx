import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

const TYPE_BADGE = { mcq:'bg-blue-100 text-blue-700', short:'bg-purple-100 text-purple-700', descriptive:'bg-indigo-100 text-indigo-700', scenario:'bg-orange-100 text-orange-700', project:'bg-green-100 text-green-700', resume:'bg-yellow-100 text-yellow-700', role:'bg-pink-100 text-pink-700', hr:'bg-gray-100 text-gray-700' };

export default function QuestionBank() {
  const { sessionId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/questions/session/${sessionId}`)
      .then((r) => setQuestions(r.data.questions || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const generateQuestions = async () => {
    setGenerating(true); setError('');
    try {
      const resumeId = state?.resumeId;
      if (!resumeId) { setError('Resume ID missing — go back and start from skill profile.'); return; }
      const { data } = await api.post('/questions/generate', { sessionId, resumeId });
      setQuestions(data.questions || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Generation failed');
    } finally { setGenerating(false); }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Question Set</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{questions.length} personalised questions</p>
        </div>
        <div className="flex gap-3">
          {questions.length === 0 && (
            <button onClick={generateQuestions} disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition-colors">
              {generating ? 'Generating…' : 'Generate Questions'}
            </button>
          )}
          {questions.length > 0 && (
            <button onClick={() => navigate(`/session/${sessionId}`, { state })}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors">
              Start Interview →
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {questions.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-gray-600 dark:text-gray-400">Click "Generate Questions" to build your personalised set.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex gap-4">
              <span className="text-gray-400 font-mono text-sm w-6 shrink-0 mt-0.5">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-gray-800 dark:text-gray-200 text-sm">{q.text}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[q.type] || 'bg-gray-100 text-gray-700'}`}>{q.type}</span>
                  <span className="text-xs text-gray-400">{q.difficulty}</span>
                  {q.skill && <span className="text-xs text-indigo-500">{q.skill}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
