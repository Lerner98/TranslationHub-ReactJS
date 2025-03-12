import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(sessionStorage.getItem('session_id'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('authUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email, password, callback) => {
    try {
      console.log('Attempting sign-in for:', email);
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      console.log('Sign-in response:', result);
      console.log('Response status:', response.status);

      if (!result.success) throw new Error(result.error || 'Authentication failed');

      // Map snake_case to camelCase for preferences
      const mappedUser = {
        ...result.user,
        defaultFromLang: result.user.default_from_lang || '',
        defaultToLang: result.user.default_to_lang || '',
      };

      sessionStorage.setItem('authUser', JSON.stringify(mappedUser));
      sessionStorage.setItem('session_id', mappedUser.session_id);
      setUser(mappedUser); // Update user state with mapped keys
      setSessionId(mappedUser.session_id);
      console.log('User state updated in AuthContext:', mappedUser);

      if (typeof callback === 'function') {
        callback();
      }

      return result;
    } catch (error) {
      console.error('Sign-in error:', error.message);
      throw new Error(error.message || 'Authentication failed');
    }
  };

  const signUp = async (email, password) => {
    try {
      console.log('Attempting sign-up for:', email);
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      console.log('Sign-up response:', result);

      if (!result.success) throw new Error(result.error);

      return result;
    } catch (error) {
      console.error('Sign-up error:', error.message);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const signOut = async () => {
    try {
      if (sessionId) {
        console.log('Attempting sign-out for session:', sessionId);
        await fetch('http://localhost:5000/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionId}`,
          },
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      sessionStorage.removeItem('authUser');
      sessionStorage.removeItem('session_id');
      setUser(null);
      setSessionId(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, loading, signIn, signUp, signOut, setUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);