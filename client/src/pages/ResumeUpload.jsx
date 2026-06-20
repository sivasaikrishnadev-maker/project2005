import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleFile = (f) => {
    const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'];
    if (!allowed.includes(f.type)) { setError('Only PDF, DOC, DOCX, TXT files are allowed.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('File must be under 5MB.'); return; }
    setError(''); setFile(f);
  };

  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data } = await api.post('/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data.resume);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Resume Uploaded!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">{result.originalName}</p>
        <p className="text-sm text-gray-400 mb-2">Sections detected: {result.sections?.join(', ')}</p>
        <p className="text-sm text-gray-400 mb-8">{result.charCount} characters extracted</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(`/skills/${result.id}`)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
            Extract Skills →
          </button>
          <button onClick={() => { setFile(null); setResult(null); }} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upload Your Resume</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Supports PDF, DOCX, DOC, TXT — up to 5MB</p>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <div
        onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-16 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
      >
        <div className="text-5xl mb-4">📄</div>
        {file ? (
          <>
            <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
            <p className="text-sm text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-gray-700 dark:text-gray-300">Drop your resume here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse</p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {file && (
        <button onClick={handleUpload} disabled={uploading}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
          {uploading ? 'Uploading & Parsing…' : 'Upload Resume'}
        </button>
      )}
    </div>
  );
}
