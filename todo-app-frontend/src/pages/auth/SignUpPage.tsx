import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createBaseConfig } from '../../config';
import { AuthApi } from '../../api/apis';
import toast from '../../utils/toast';
import { motion } from 'framer-motion';
import VersionChangelog from '../../components/VersionChangelog';
import ConstellationBackground from '../../components/ConstellationBackground';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const SignUpPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Detect browser type for specific rendering
  const [isChromiumBased, setIsChromiumBased] = useState(false);

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

  // Validation logic
  useEffect(() => {
    let uError = null;
    if (username && (username.length < 3 || username.length > 50)) {
      uError = 'Username must be 3-50 characters.';
    } else if (username && !USERNAME_REGEX.test(username)) {
      uError = 'Username can only contain letters, numbers, and underscores.';
    }
    setUsernameError(uError);

    const validateForm = () => {
      if (!username || !email || !password || uError) {
        return false;
      }
      if (password.length < 8) {
        return false;
      }
      if (password !== confirmPassword) {
        return false;
      }
      return true;
    };
    setIsFormValid(validateForm());
  }, [username, email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      // Check for username error specifically to guide user
      if (!username) setUsernameError('Username is required.');
      else if (username.length < 3 || username.length > 50) setUsernameError('Username must be 3-50 characters.');
      else if (!USERNAME_REGEX.test(username)) setUsernameError('Username can only contain letters, numbers, and underscores.');
      
      if (!email) setError('Email is required.'); // Example for other fields
      else if (!password) setError('Password is required.');
      else if (password.length < 8) setError('Password must be at least 8 characters.');
      else if (password !== confirmPassword) setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsernameError(null);

    try {
      const authApi = new AuthApi(createBaseConfig());

      // Call registerUserApiAuthRegisterPost to register the user
      await authApi.registerUserApiAuthRegisterPost({ userCreate: { username, email, password } });

      // On successful registration, attempt to log in the user
      await login(username, password); // Use username for login
      toast.success('Registration successful! Welcome!');

      navigate('/');
    } catch (err: any) {
      console.error('Error during signup:', err);
      let errorMsg = 'Failed to create account. Please try again.';
      // Attempt to parse backend error
      if (err.body && typeof err.body.detail === 'string') { // OpenAPI TS generator often puts error in err.body
        errorMsg = err.body.detail;
      } else if (err.response && err.response.data) { // Fallback for other error structures
        try {
          const responseData = await err.response.json();
          if (responseData.detail) {
            errorMsg = Array.isArray(responseData.detail) 
              ? responseData.detail.map((errorItem: any) => errorItem.msg || 'Unknown error').join(', ') 
              : responseData.detail;
          }
        } catch (jsonErr) {
          console.error('Error parsing error response:', jsonErr);
        }
      }
      setError(errorMsg);
      // If error message indicates username taken, set it as usernameError
      if (errorMsg.toLowerCase().includes('username')) {
        setUsernameError(errorMsg);
        setError(null); // Clear general error if it's a username specific one
      }

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Constellation Background */}
      <ConstellationBackground />
      
      {/* Signup Content */}
      <div className="relative z-10 w-full max-w-md">
        <motion.div 
          className="text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.h1 
            className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
            style={{
              textShadow: '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)',
              letterSpacing: '1px',
              padding: '0.25rem 0',
              lineHeight: '1.5',
            }}
          >
            ThoughtSpace
          </motion.h1>

          <motion.p 
            className="text-gray-300 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            Where Ideas Connect
          </motion.p>
        </motion.div>

        <div className="w-full p-8 space-y-6 bg-gray-800/95 rounded-xl shadow-2xl shadow-purple-500/20 border border-gray-700/80 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight">
            Create Account
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-300">
                Username
              </label>
              <input
                type="text"
                name="username"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-2.5 bg-gray-700/60 border rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200 disabled:opacity-60 ${usernameError ? 'border-red-500/70 focus:ring-red-500 focus:border-red-500 focus:shadow-red-500/30' : 'border-gray-600 focus:ring-blue-500'}`}
                placeholder="Username (3-50 chars, A-Z, 0-9, _)"
                required
                disabled={isLoading}
                aria-describedby="username-error"
              />
              {usernameError && <p id="username-error" className="text-xs text-red-400 mt-1.5 ml-1">{usernameError}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200 disabled:opacity-60"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200 disabled:opacity-60"
                placeholder="Password (min 8 chars)"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 bg-gray-700/60 border rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200 disabled:opacity-60 ${password && confirmPassword && password !== confirmPassword ? 'border-red-500/70 focus:ring-red-500 focus:border-red-500 focus:shadow-red-500/30' : 'border-gray-600 focus:ring-blue-500'}`}
                placeholder="Confirm password"
                required
                disabled={isLoading}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1.5 ml-1">Passwords do not match.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full px-4 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-purple-500/40 focus:shadow-purple-500/40"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0116 0"></path>
                </svg>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {error && !usernameError && (
            <p className="text-red-400 text-sm text-center mt-4">{error}</p>
          )}

          <p className="text-sm text-center text-gray-400 mt-4">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-blue-400 hover:text-purple-400 focus:outline-none focus:underline focus:text-purple-300 transition-colors duration-150"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
      <VersionChangelog />
    </div>
  );
};

export default SignUpPage;