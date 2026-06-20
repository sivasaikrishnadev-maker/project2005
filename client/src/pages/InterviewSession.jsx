import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

export default function InterviewSession() {
  const { sessionId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState('');

  useEffect(() => {
    api.get(`/questions/session/${sessionId}`)
      .then((r) => setQuestions(r.data.questions || []))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const q = questions[current];
  const total = questions.length;
  const isMCQ = q?.type === 'mcq';
  const isDone = Object.keys(submitted).length === total && total > 0;

  const handleSubmit = async () => {
    if (!q) return;
    const text = isMCQ ? selectedOption : answer.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/answers/submit', { sessionId, questionId: q._id, answerText: text });
      setSubmitted((prev) => ({ ...prev, [q._id]: data.answer }));
      setAnswer(''); setSelectedOption('');
      if (current < total - 1) setCurrent((c) => c + 1);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const finish = async () => {
    await api.patch(`/sessions/${sessionId}/complete`);
    if (state?.resumeId) {
      await api.post('/analytics/generate', { sessionId, resumeId: state.resumeId }).catch(() => {});
    }
    navigate(`/review/${sessionId}`);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading session…</div>;
  if (questions.length === 0) return <div className="text-center py-20 text-gray-400">No questions — <button onClick={() => navigate(-1)} className="text-indigo-600 underline">go back</button></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">Question {current + 1} of {total}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{Object.keys(submitted).length} answered</p>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-8">
        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>

      {/* Question card */}
      {!isDone && q && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 mb-6">
          <div className="flex gap-2 mb-4">
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">{q.type}</span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2.5 py-1 rounded-full">{q.difficulty}</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{q.text}</h2>

          {isMCQ ? (
            <div className="space-y-3">
              {q.options?.map((opt) => (
                <button key={opt} onClick={() => setSelectedOption(opt)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${selectedOption === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6}
              placeholder="Type your answer here…"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm" />
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={handleSubmit} disabled={submitting || (!answer.trim() && !selectedOption)}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
              {submitting ? 'Evaluating…' : submitted[q._id] ? 'Re-Submit' : 'Submit Answer'}
            </button>
            {current > 0 && (
              <button onClick={() => setCurrent((c) => c - 1)} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">← Prev</button>
            )}
            {current < total - 1 && (
              <button onClick={() => setCurrent((c) => c + 1)} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">Next →</button>
            )}
          </div>

          {submitted[q._id] && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Score: {submitted[q._id].score}/10</p>
              {submitted[q._id].strengths?.length > 0 && <p className="text-xs text-green-600 dark:text-green-500 mt-1">✅ {submitted[q._id].strengths[0]}</p>}
              {submitted[q._id].weaknesses?.length > 0 && <p className="text-xs text-red-500 mt-1">⚠️ {submitted[q._id].weaknesses[0]}</p>}
            </div>
          )}
        </div>
      )}

      {/* Question nav dots */}
      <div className="flex flex-wrap gap-2 mb-6">
        {questions.map((qq, i) => (
          <button key={qq._id} onClick={() => setCurrent(i)}
            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${submitted[qq._id] ? 'bg-green-500 text-white' : i === current ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {i + 1}
          </button>
        ))}
      </div>

      {Object.keys(submitted).length > 0 && (
        <button onClick={finish}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors">
          {isDone ? 'Finish & View Results' : `Finish Early (${Object.keys(submitted).length}/${total} answered)`}
        </button>
      )}
    </div>
  );
}
