/*
This file creates a React context for managing our users authentication state
and provides functions for signing in, signing up, and signing out. 
Also used across the app to share authentication data.
*/

/*
createContext = creates the AuthContext to share auth state
useState = manages our user, sessionId and loading states
useContext = provides the useAuth hook to access the context
useEffect = loads user from sessionStorage when app mounts
*/
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext({});

// AuthProvider wraps the app providing the context value, (like user, sessionId...) Exports for components to access the context
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // logged-in user's data (id, email, session_id, signed_session_id)
  const [sessionId, setSessionId] = useState(sessionStorage.getItem('session_id')); // Raw session_id
  const [signedSessionId, setSignedSessionId] = useState(sessionStorage.getItem('signed_session_id')); // Signed session_id
  const [loading, setLoading] = useState(true); // indicates if the app is still loading the user state

  /*
  Loading User Session on App Start:
  checks sessionStorage for saved authUser, parses it, sets the user state, then sets loading to false
  */
  useEffect(() => {
    const savedUser = sessionStorage.getItem('authUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setSessionId(parsedUser.session_id);
      setSignedSessionId(parsedUser.signed_session_id);
    }
    setLoading(false);
  }, []); // Loads user from `sessionStorage` on mount to persist login. Key for seamless session continuity—ensure `authUser` format matches expected structure.

  /*
  User Login (sign-in): 
  sends a post login request to the backend through /api/login
  converts the response into JSON (result)
  handles incorrect credentials
  */
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

      /*
      Mapping User Data & Saving Session:
      maps `default_from_lang` to `defaultFromLang` with `''` fallback to initialize new users with empty preferences
      */
      const mappedUser = {
        ...result.user,
        defaultFromLang: result.user.default_from_lang || '',
        defaultToLang: result.user.default_to_lang || '',
        signed_session_id: result.user.signed_session_id, // Include signed_session_id from response
      }; 
      
      // saves user, session_id, and signed_session_id to session storage for persistence
      sessionStorage.setItem('authUser', JSON.stringify(mappedUser));
      sessionStorage.setItem('session_id', mappedUser.session_id);
      sessionStorage.setItem('signed_session_id', mappedUser.signed_session_id);
      setUser(mappedUser); // Update user state with mapped keys
      setSessionId(mappedUser.session_id);
      setSignedSessionId(mappedUser.signed_session_id);
      console.log('User state updated in AuthContext:', mappedUser);
      // runs callback if provided (redirect after login)
      if (typeof callback === 'function') {
        callback();
      }

      return result;
    } catch (error) {
      console.error('Sign-in error:', error.message);
      throw new Error(error.message || 'Authentication failed');
    }
  };

  /*
  User Registration (sign-up):
  sends a post registration request to /api/register to create a new user
  either returns success or error response
  */
  const signUp = async (email, password) => {
    try {
      console.log('Attempting sign-up for:', email);
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      console.log('Sign-up response:', result); // sign-up status for debugging

      if (!result.success) throw new Error(result.error);

      return result;
    } catch (error) {
      console.error('Sign-up error:', error.message);
      throw new Error(error.message || 'Registration failed');
    }
  };

  /*
  User Logout (sign-out):
  uses authorization header (Bearer ${signedSessionId}) for security
  post request to /api/logout
  clears sessionStorage and resets the user and sessionId states
  */
  const signOut = async () => {
    try {
      if (signedSessionId) {
        console.log('Attempting sign-out for signedSessionId:', signedSessionId);
        await fetch('http://localhost:5000/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${signedSessionId}`,
          },
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally { // ensure logout even on api failure
      sessionStorage.removeItem('authUser');
      sessionStorage.removeItem('session_id');
      sessionStorage.removeItem('signed_session_id');
      setUser(null);
      setSessionId(null);
      setSignedSessionId(null);
    } 
  };

  // makes the auth functions available via the AuthContext.Provider
  // prevents rendering children until auth state is loaded (!loading)
  return (
    <AuthContext.Provider value={{ user, sessionId, signedSessionId, loading, signIn, signUp, signOut, setUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// useAuth allows the components to access the auth state
export const useAuth = () => useContext(AuthContext);