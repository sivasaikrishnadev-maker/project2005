import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import api from '../api/axios';

const HEAT_COLORS = ['#dbeafe','#93c5fd','#3b82f6','#1d4ed8','#1e3a8a'];
const heatColor = (score) => HEAT_COLORS[Math.min(Math.floor(score / 2.5), 4)];

export default function AnalyticsTrends() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/me')
      .then((r) => setAnalytics(r.data.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading trends…</div>;

  if (!analytics) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-4">📈</p>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No trend data yet</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Complete at least one session to see your performance trends.</p>
      <Link to="/resume" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">Get Started</Link>
    </div>
  );

  const trendData = (analytics.performanceTrend || []).map((p, i) => ({
    session: `S${i + 1}`,
    Score: p.avgScore,
    date: p.date ? new Date(p.date).toLocaleDateString() : '',
  }));

  // Build heatmap data: array of {skill, session, score}
  const heatmapRaw = analytics.heatmap || [];
  const heatCells = [];
  heatmapRaw.forEach((row, ri) => {
    (row.sessions || []).forEach((s, ci) => {
      heatCells.push({ x: ci, y: ri, score: s.score, skill: row.skill });
    });
  });
  const heatSkills = heatmapRaw.map((r) => r.skill);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics — Trends</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Performance over time and skill confidence</p>
        </div>
        <Link to="/analytics/readiness" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">← Readiness</Link>
      </div>

      {/* Performance trend line chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Performance Trend</h2>
        {trendData.length >= 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="session" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}/10`, 'Avg Score']} labelFormatter={(l) => `Session ${l}`} />
              <Line type="monotone" dataKey="Score" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5, fill: '#6366f1' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm">Complete more sessions to see your trend line.</p>
        )}
      </div>

      {/* Skill confidence heatmap */}
      {heatCells.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Skill Confidence Heatmap</h2>
          <p className="text-xs text-gray-400 mb-4">Darker = higher score. Each column = one session.</p>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `120px repeat(${Math.max(...heatmapRaw.map((r) => r.sessions?.length || 0), 1)}, 36px)` }}>
              {heatmapRaw.map((row) => (
                <>
                  <span key={`label-${row.skill}`} className="text-xs text-gray-500 dark:text-gray-400 self-center truncate pr-2">{row.skill}</span>
                  {(row.sessions || []).map((s, ci) => (
                    <div key={`${row.skill}-${ci}`} title={`${row.skill}: ${s.score}/10`}
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: heatColor(s.score) }}>
                      {s.score}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <span>Low</span>
            {HEAT_COLORS.map((c, i) => <div key={i} className="w-5 h-3 rounded" style={{ backgroundColor: c }} />)}
            <span>High</span>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Skill Confidence Heatmap</h2>
          <p className="text-gray-400 text-sm">Answer skill-tagged questions to populate the heatmap.</p>
        </div>
      )}

      {/* Session summary table */}
      {trendData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Session Summary</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2">Session</th><th className="pb-2">Date</th><th className="pb-2">Avg Score</th><th className="pb-2">Level</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((row) => (
                <tr key={row.session} className="border-b border-gray-50 dark:border-gray-700">
                  <td className="py-2 font-medium text-gray-900 dark:text-white">{row.session}</td>
                  <td className="py-2 text-gray-400">{row.date}</td>
                  <td className="py-2 font-bold text-indigo-600 dark:text-indigo-400">{row.Score}/10</td>
                  <td className="py-2 text-gray-500">{row.Score >= 7 ? '🟢 Strong' : row.Score >= 4 ? '🟡 Moderate' : '🔴 Needs Work'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
