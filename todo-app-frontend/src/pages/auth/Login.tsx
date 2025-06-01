import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import VersionChangelog from '../../components/VersionChangelog';
import ConstellationBackground from '../../components/ConstellationBackground';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isChromiumBased, setIsChromiumBased] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LocationState)?.from?.pathname || '/';

  // Detect browser type
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (
      userAgent.includes('chrome') || 
      userAgent.includes('edg') || 
      userAgent.includes('opr') ||
      userAgent.includes('safari') ||
      userAgent.includes('iphone') || 
      userAgent.includes('ipad')
    ) {
      setIsChromiumBased(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  if (isAuthenticated && !isLoading) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      await login(username, password);
      // Success: AuthContext handles navigation
    } catch (err: any) {
      console.error('[Login Page] Login error object:', err);
      let errorMsg = 'Login failed. Please try again later.';
      let isCredentialError = false;

      const detail = err?.body?.detail || err?.response?.data?.detail || err?.message;
      
      if (err?.response?.status === 401 || (typeof detail === 'string' && detail.toLowerCase().includes('incorrect username or password')) || (typeof detail === 'string' && detail.toLowerCase().includes('no active user found with the given credentials')) ) {
          errorMsg = 'Incorrect username or password.';
          setFormError(errorMsg);
          isCredentialError = true;
      } else if (detail && typeof detail === 'string') {
          errorMsg = detail;
      } else {
          errorMsg = 'Login failed. Please try again later.';
      }
      
      if (!isCredentialError) {
        console.log(`[Login Page] Displaying toast error: "${errorMsg}"`);
      } else {
        console.log(`[Login Page] Displaying form error: "${errorMsg}"`);
      }
      setIsSubmitting(false);
    }
  };

  const formVariants = {
    shake: {
      x: [0, -8, 8, -6, 6, -4, 4, 0],
      transition: { duration: 0.4, ease: 'easeInOut' }
    },
    initial: {
      x: 0
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Constellation Background */}
      <ConstellationBackground />
      
      {/* Login Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Animated logo and title above the form */}
        <motion.div 
          className="text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          {isChromiumBased ? (
            <motion.h1 
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
              style={{
                textShadow: '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)',
                letterSpacing: '1px',
                padding: '0.25rem 0',
                lineHeight: '1.5',
              }}
              animate={{
                textShadow: [
                  '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)',
                  '0 0 15px rgba(147, 51, 234, 0.9), 0 0 25px rgba(79, 70, 229, 0.7)',
                  '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)'
                ]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              ThoughtSpace
            </motion.h1>
          ) : (
            <motion.h1 
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
              style={{
                textShadow: '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)',
                letterSpacing: '1px',
                padding: '0.25rem 0',
                lineHeight: '1.5',
              }}
              animate={{
                textShadow: [
                  '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)',
                  '0 0 15px rgba(147, 51, 234, 0.9), 0 0 25px rgba(79, 70, 229, 0.7)',
                  '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)'
                ]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <span className="inline-block py-4">
                {"ThoughtSpace".split('').map((letter, index) => (
                  <motion.span
                    key={index}
                    className="inline-block overflow-visible"
                    animate={{
                      y: [0, -5, 0],
                      scale: [1, 1.1, 1],
                      rotate: [0, -2, 0]
                    }}
                    transition={{
                      duration: 2,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "loop",
                      delay: index * 0.1,
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            </motion.h1>
          )}
          <motion.p 
            className="text-gray-300 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            Where Ideas Connect
          </motion.p>
        </motion.div>

        <motion.div 
          className="w-full p-8 space-y-6 bg-gray-800/95 rounded-xl shadow-2xl shadow-purple-500/20 border border-gray-700/80 backdrop-blur-sm"
          variants={formVariants}
          animate={formError ? "shake" : "initial"}
          key={formError}
        >
          <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight">
            Welcome Back
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-300">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200 disabled:opacity-60"
                placeholder="Enter your username"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200 disabled:opacity-60"
                placeholder="Password"
                required
                disabled={isSubmitting}
              />
            </div>
            
            {/* Form Error Display - Refined Styling and Animation */}
            <div className="h-6"> {/* Container to reserve space and prevent layout shift */}
              <AnimatePresence>
                {formError && (
                  <motion.p
                    key="form-error-message"
                    className="text-sm text-red-400 text-center"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95, transition: { duration: 0.2 }}}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {formError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-purple-500/40 focus:shadow-purple-500/40"
            >
              {isSubmitting ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          
          {/* Updated Registration link styling */}
          <p className="text-sm text-center text-gray-400">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-medium text-blue-400 hover:text-purple-400 focus:outline-none focus:underline focus:text-purple-300 transition-colors duration-150"
            >
              Register
            </Link>
          </p>
        </motion.div>
      </div>
      <VersionChangelog />
    </div>
  );
};

export default Login;