import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ExternalLink, X } from 'lucide-react';

const AuthScreen = ({ onCancel, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null); // For registration success
  const [signInComplete, setSignInComplete] = useState(false); // Trigger modal close
  const { signIn, signUp, user } = useAuth();

  // Close modal when sign-in is complete and user state is updated
  useEffect(() => {
    console.log('useEffect triggered, signInComplete:', signInComplete, 'user:', user);
    if (signInComplete && user) {
      console.log('User state updated, closing modal:', user);
      if (onSuccess) onSuccess(); // Close modal and re-render ProfileScreen
      setSignInComplete(false); // Reset after success
    } else if (signInComplete && !user) {
      console.log('User state not yet updated, retrying...');
      setTimeout(() => {
        console.log('Fallback check, user:', user);
        if (user) {
          console.log('User state updated in fallback, closing modal:', user);
          if (onSuccess) onSuccess();
          setSignInComplete(false);
        } else {
          console.log('User state still not updated after delay');
          setSignInComplete(false);
          setError('Authentication state not updated. Please try again.');
        }
      }, 1000); // 1000ms delay to ensure state propagation
    }
  }, [signInComplete, user, onSuccess]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    return passwordRegex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSignInComplete(false);
    console.log('handleSubmit started, isLogin:', isLogin, 'email:', email);

    // Validate inputs
    if (!email || !password) {
      setError('Please provide both email and password.');
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!isLogin && !validatePassword(password)) {
      setError('Password must be at least 8 characters long, contain at least one uppercase letter, and one special character.');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (isLogin) {
        console.log('Attempting sign-in with email:', email);
        result = await signIn(email, password, () => {
          console.log('Sign-in callback triggered, user state:', user);
          setSignInComplete(true); // Set to true to trigger useEffect
        });
        console.log('Sign-in result:', result);
        if (!result || !result.success) {
          throw new Error(result?.error || 'Authentication failed');
        }
        console.log('Sign-in successful, user state:', user);
      } else {
        // Clear sessionStorage before registering a new user to avoid stale preferences
        sessionStorage.removeItem('authUser');
        sessionStorage.removeItem('session_id');
        console.log('Attempting sign-up with email:', email);
        result = await signUp(email, password);
        if (!result || !result.success) {
          throw new Error(result?.error || 'Authentication failed');
        }
        setSuccessMessage('Registration successful! Please sign in to continue.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err.message);
      setError(err.message);
    } finally {
      console.log('handleSubmit finally block, loading set to false');
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6 relative">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 relative">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isLogin ? 'Sign in to your account' : 'Join TranslationHub today'}
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-200 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
            {!isLogin && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Password requirements:
                <ul className="mt-1 list-disc list-inside">
                  <li>At least 8 characters</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one special character</li>
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                or
              </span>
            </div>
          </div>

          <button
            onClick={handleContinueAsGuest}
            className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Continue as Guest</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;