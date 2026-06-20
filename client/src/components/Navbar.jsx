import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from './DarkModeToggle';

export default function Navbar() {
  const { isAuth, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={isAuth ? '/dashboard' : '/'} className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          InterviewPrep AI
        </Link>
        <div className="flex items-center gap-4">
          <DarkModeToggle />
          {isAuth ? (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                Hi, {user?.name?.split(' ')[0]}
              </span>
              <Link to="/dashboard" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Dashboard</Link>
              <button onClick={handleLogout} className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600">Login</Link>
              <Link to="/signup" className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
