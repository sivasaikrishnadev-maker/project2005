import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import api from '../api/axios';

const GAP_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

export default function AnalyticsReadiness() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/me')
      .then((r) => setAnalytics(r.data.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">
        Loading analytics…
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">📊</p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No analytics yet
        </h2>

        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Complete an interview session to generate your analytics.
        </p>

        <Link
          to="/resume"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Upload Resume to Start
        </Link>
      </div>
    );
  }

  const score = analytics.readinessScore || 0;

  const radialData = [
    {
      name: 'Readiness',
      value: score,
      fill:
        score >= 70
          ? '#22c55e'
          : score >= 40
          ? '#f97316'
          : '#ef4444',
    },
  ];

  const gapData = (analytics.skillGaps || [])
    .slice(0, 8)
    .map((g) => ({
      skill: g.skill,
      Current: g.currentLevel,
      Required: g.requiredLevel,
      gap: g.gap,
    }));

  const companyData = (analytics.companyReadiness || []).map((c) => ({
    name: c.company,
    Score: c.score,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics — Readiness
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Your interview readiness snapshot
          </p>
        </div>

        <Link
          to="/analytics/trends"
          className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
        >
          View Trends →
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

        {/* Readiness Score */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center">

          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Readiness Score
          </h2>

          <div className="relative w-full h-[180px]">

            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={radialData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: '#e5e7eb' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p
                className={`text-4xl font-bold ${
                  score >= 70
                    ? 'text-green-500'
                    : score >= 40
                    ? 'text-orange-500'
                    : 'text-red-500'
                }`}
              >
                {score}%
              </p>
            </div>

          </div>

          <p className="text-sm text-gray-400 mt-2">
            {score >= 70
              ? 'Interview Ready! 🎉'
              : score >= 40
              ? 'Getting There 💪'
              : 'Keep Practising 📚'}
          </p>

        </div>

        {/* Company Readiness */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 sm:col-span-1 lg:col-span-2">

          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Company Readiness
          </h2>

          {companyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={companyData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />

                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />

                <Tooltip formatter={(v) => `${v}%`} />

                <Bar
                  dataKey="Score"
                  radius={[0, 6, 6, 0]}
                >
                  {companyData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        [
                          '#6366f1',
                          '#8b5cf6',
                          '#06b6d4',
                          '#22c55e',
                          '#f97316',
                          '#ef4444',
                        ][i % 6]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">
              No company data yet.
            </p>
          )}

        </div>
      </div>

      {/* Skill Gap Analysis */}
      {gapData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-8">

          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Skill Gap Analysis
          </h2>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={gapData}
              layout="vertical"
              margin={{ left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
              />

              <XAxis
                type="number"
                domain={[0, 10]}
                tick={{ fontSize: 11 }}
              />

              <YAxis
                type="category"
                dataKey="skill"
                tick={{ fontSize: 11 }}
                width={100}
              />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="Current"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
              />

              <Bar
                dataKey="Required"
                fill="#e5e7eb"
                radius={[0, 4, 4, 0]}
              />

            </BarChart>
          </ResponsiveContainer>

        </div>
      )}

      {/* Improvement Roadmap */}
      {analytics.roadmap?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">

          <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Improvement Roadmap
          </h2>

          <ol className="space-y-3">

            {analytics.roadmap.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">
                  {i + 1}
                </span>

                {item}
              </li>
            ))}

          </ol>

        </div>
      )}

    </div>
  );
}