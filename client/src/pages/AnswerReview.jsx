import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

const ScoreBar = ({ score }) => {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold w-10 text-right">{score}/10</span>
    </div>
  );
};

export default function AnswerReview() {
  const { sessionId } = useParams();
  const [answers, setAnswers] = useState([]);
  const [avgScore, setAvgScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get(`/answers/session/${sessionId}`)
      .then((r) => { setAnswers(r.data.answers || []); setAvgScore(r.data.avgScore || 0); })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading results…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Session Review</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{answers.length} answers evaluated</p>
        </div>
        <div className="flex gap-3">
          <Link to="/analytics/readiness" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors">View Analytics</Link>
          <Link to="/dashboard" className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Dashboard</Link>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center">
        <div className="text-center">
          <div className={`text-5xl font-bold ${avgScore >= 7 ? 'text-green-600' : avgScore >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{avgScore}</div>
          <div className="text-sm text-gray-400 mt-1">Average Score / 10</div>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">{avgScore >= 7 ? 'Great performance! You are well prepared.' : avgScore >= 4 ? 'Good effort. Review the feedback to strengthen weak areas.' : 'Keep practising — focus on the improvement tips below.'}</p>
        </div>
      </div>

      {/* Answer cards */}
      <div className="space-y-4">
        {answers.map((a, i) => (
          <div key={a._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setExpanded(expanded === a._id ? null : a._id)}
              className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">Q{i + 1}. {a.question?.text}</p>
                <div className="mt-2 max-w-xs"><ScoreBar score={a.score || 0} /></div>
              </div>
              <span className="text-gray-400">{expanded === a._id ? '▲' : '▼'}</span>
            </button>

            {expanded === a._id && (
              <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 space-y-4 pt-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Your Answer</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">{a.answerText}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Reference Answer</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3">{a.question?.referenceAnswer}</p>
                </div>
                {a.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase mb-1">Strengths</p>
                    {a.strengths.map((s, j) => <p key={j} className="text-sm text-green-700 dark:text-green-400">✅ {s}</p>)}
                  </div>
                )}
                {a.weaknesses?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase mb-1">Weaknesses</p>
                    {a.weaknesses.map((w, j) => <p key={j} className="text-sm text-red-600 dark:text-red-400">⚠️ {w}</p>)}
                  </div>
                )}
                {a.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Recommendations</p>
                    {a.recommendations.map((r, j) => <p key={j} className="text-sm text-indigo-600 dark:text-indigo-400">💡 {r}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
