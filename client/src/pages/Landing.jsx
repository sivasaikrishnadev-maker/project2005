import { Link } from 'react-router-dom';

const features = [
  { icon: '📄', title: 'Resume Parsing', desc: 'Upload PDF, DOCX, or TXT. Every skill extracted automatically.' },
  { icon: '🧠', title: 'NLP Skill Extraction', desc: 'Skills found in descriptions, not just the skills section.' },
  { icon: '🎯', title: 'Role Matching', desc: 'Matched to roles with confidence scores and gap analysis.' },
  { icon: '💬', title: 'Smart Questions', desc: '8 question types: MCQ, scenario, project, HR, and more.' },
  { icon: '📊', title: 'Answer Evaluation', desc: 'Instant scoring with strengths, weaknesses, and tips.' },
  { icon: '📈', title: 'Analytics Dashboard', desc: 'Readiness score, heatmap, trends, and company readiness.' },
];

export default function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-20">
        <div className="inline-block bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-sm font-medium px-4 py-1 rounded-full mb-6">
          AI-Powered Interview Preparation
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Ace Your Next<br /><span className="text-indigo-600 dark:text-indigo-400">Tech Interview</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Upload your resume, get skill analysis, practice with personalised questions, and track your readiness.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-lg">Get Started Free</Link>
          <Link to="/login" className="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold px-8 py-3 rounded-xl transition-colors text-lg">Sign In</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
        {features.map((f) => (
          <div key={f.title} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to prepare smarter?</h2>
        <p className="text-indigo-100 mb-8 text-lg">Join students landing their dream tech roles.</p>
        <Link to="/signup" className="bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors inline-block">Start Preparing Now</Link>
      </div>
    </div>
  );
}
