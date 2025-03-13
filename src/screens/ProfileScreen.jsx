/*
This screen component serves as the user profile screen (both logged in and guests)
it allows the users to view profile details, set & save default language preferences for future translations
view translation history
register, sign-in through AuthScreen and sign out in profile
*/

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // handles redirection after logout
import { useAuth } from '../context/AuthContext'; // for user, signOut, sessionId, setUser
import AuthScreen from './AuthScreen'; // accessing our register/sign-in screen, only available in profile page
import LanguageSearch from '../components/LanguageSearch';

// State Management
const ProfileScreen = () => {
  const { user, signedSessionId, signOut, setUser } = useAuth(); 
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false); // a toggle to control if authScreen is displayed or not
  const [defaultFromLang, setDefaultFromLang] = useState( // stores pref languages
    user?.defaultFromLang !== undefined ? user.defaultFromLang : ''
  );
  const [defaultToLang, setDefaultToLang] = useState(
    user?.defaultToLang !== undefined ? user.defaultToLang : ''
  );
  const [activeTab, setActiveTab] = useState('text'); // switches between text & voice translation history
  const [translations, setTranslations] = useState(null); // users translation history
  const [loading, setLoading] = useState(!!user); // tracks the api requests for fetching data
  const [error, setError] = useState(null); 
  const [renderKey, setRenderKey] = useState(0); // forces re-render after auth success

  /*
  Fetching & Updating Preferences (Logged-In Users):
  runs once on mount
  fetches the user preferences from the api
  updates the AuthContext state and sessionStorage
  if server returns empty preferences it resets them to '' for new users
  */
  useEffect(() => {
    if (user) {
      const fetchPreferences = async () => {
        try {
          console.log('Fetching preferences for user:', user.id);
          const response = await fetch(`http://localhost:5000/api/user/preferences/${user.id}`, {
            headers: { 'Authorization': `Bearer ${user.signed_session_id}` },
          });
          const preferencesResult = await response.json();
          if (response.ok && preferencesResult.success) {
            const newDefaultFromLang = preferencesResult.preferences.default_from_lang || '';
            const newDefaultToLang = preferencesResult.preferences.default_to_lang || '';
            // Clear preferences in sessionStorage and user state if they are empty from the server
            if (!newDefaultFromLang && !newDefaultToLang) {
              const clearedUser = { ...user, defaultFromLang: '', defaultToLang: '' };
              sessionStorage.setItem('authUser', JSON.stringify(clearedUser));
              setUser(clearedUser);
              setDefaultFromLang('');
              setDefaultToLang('');
            } else {
              setDefaultFromLang(newDefaultFromLang);
              setDefaultToLang(newDefaultToLang);
              const updatedUser = { 
                ...user, 
                defaultFromLang: newDefaultFromLang, 
                defaultToLang: newDefaultToLang 
              };
              sessionStorage.setItem('authUser', JSON.stringify(updatedUser));
              setUser(updatedUser); // Update AuthContext
              console.log('Preferences updated:', { defaultFromLang: newDefaultFromLang, defaultToLang: newDefaultToLang });
            }
          }
        } catch (err) {
          console.error('Error fetching preferences:', err);
        }
      };
      fetchPreferences();
    } 
  }, []); 

  // Handle translation history and state updates
  useEffect(() => {
    console.log('useEffect triggered - user:', user, 'activeTab:', activeTab); // Debug log
    if (user) {
      console.log('User object on load or update:', user); // Log to verify state update
      setDefaultFromLang(user.defaultFromLang !== undefined ? user.defaultFromLang : '');
      setDefaultToLang(user.defaultToLang !== undefined ? user.defaultToLang : '');
      loadTranslationHistory();
    } else {
      setDefaultFromLang(localStorage.getItem('guestDefaultFromLang') || '');
      setDefaultToLang(localStorage.getItem('guestDefaultToLang') || '');
      loadGuestHistory();
    }
  }, [user, activeTab]); // Dependencies for translation history updates

  /*
  Managing Translation History:
  fetching translation history for logged in users from api
  handles both text and voice translations dynamically
  ensures only valid translation data is stored
  */
  const loadTranslationHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let data = [];
      if (activeTab === 'text') {
        const response = await fetch(`http://localhost:5000/api/translation/text/${user.id}`, {
          headers: { 'Authorization': `Bearer ${user.signed_session_id}` },
        });
        if (!response.ok) throw new Error('Failed to fetch text translations');
        data = await response.json();
      } else if (activeTab === 'voice') {
        const response = await fetch(`http://localhost:5000/api/translation/voice/${user.id}`, {
          headers: { 'Authorization': `Bearer ${user.signed_session_id}` },
        });
        if (!response.ok) throw new Error('Failed to fetch voice translations');
        data = await response.json();
      }
      console.log('Fetched translations (logged-in user):', data); // Debug log
      const validData = data.filter(t =>
        t.from_lang && t.to_lang && t.original_text && t.translated_text &&
        typeof t.from_lang === 'string' && t.from_lang.trim() !== '' &&
        typeof t.to_lang === 'string' && t.to_lang.trim() !== '' &&
        typeof t.original_text === 'string' && t.original_text.trim() !== '' &&
        typeof t.translated_text === 'string' && t.translated_text.trim() !== ''
      );
      setTranslations(validData.length > 0 ? validData : null);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load translation history.');
    } finally {
      setLoading(false);
    }
  }; 
  // Fetching Guest Translation History, loads translation history from localStorage limits to 20, for guest users
  const loadGuestHistory = () => {
    const savedTranslations = JSON.parse(localStorage.getItem('guestTranslations') || '[]');
    console.log('Guest translations from localStorage:', savedTranslations); // Debug log
    const validTranslations = savedTranslations.filter(t =>
      t.fromLang && t.toLang && t.originalText && t.translatedText &&
      typeof t.fromLang === 'string' && t.fromLang.trim() !== '' &&
      typeof t.toLang === 'string' && t.toLang.trim() !== '' &&
      typeof t.originalText === 'string' && t.originalText.trim() !== '' &&
      typeof t.translatedText === 'string' && t.translatedText.trim() !== ''
    );
    console.log('Valid guest translations after filter:', validTranslations); // Debug log
    setTranslations(validTranslations.length > 0 ? validTranslations.slice(0, 20) : null);
    setLoading(false);
  };

  /*
  Saving Language Preferences:
  saves preferences to the database (logged-in users)
  stores preferences in localStorage(guest users)
  */
  const savePreferences = async () => {
    if (user) {
      try {
        const requestBody = {
          userId: user.id,
          default_from_lang: defaultFromLang,
          default_to_lang: defaultToLang,
        };
        console.log('Sending preferences POST request to:', 'http://localhost:5000/api/user/preferences', 'with body:', requestBody);
        const response = await fetch('http://localhost:5000/api/user/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.signed_session_id}`,
          },
          body: JSON.stringify(requestBody),
        });
        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse POST response as JSON:', responseText);
          throw new Error(`Invalid POST response: ${responseText}`);
        }
        console.log('Save preferences response:', result, 'Status:', response.status);
        if (!response.ok) throw new Error(result.error || `Failed to save preferences (Status: ${response.status})`);

        alert('Preferences saved successfully!');

        // Fetch updated preferences
        console.log('Sending preferences GET request to:', `http://localhost:5000/api/user/preferences/${user.id}`);
        const preferencesResponse = await fetch(`http://localhost:5000/api/user/preferences/${user.id}`, {
          headers: { 'Authorization': `Bearer ${user.signed_session_id}` },
        });
        console.log('GET preferences response status:', preferencesResponse.status);
        const preferencesResponseText = await preferencesResponse.text();
        let preferencesResult;
        try {
          preferencesResult = JSON.parse(preferencesResponseText);
        } catch (parseError) {
          console.error('Failed to parse GET response as JSON:', preferencesResponseText);
          throw new Error(`Failed to fetch updated preferences: ${preferencesResponseText}`);
        }
        if (preferencesResponse.ok && preferencesResult.success) {
          setDefaultFromLang(preferencesResult.preferences.default_from_lang);
          setDefaultToLang(preferencesResult.preferences.default_to_lang);
          const updatedUser = { ...user, defaultFromLang: preferencesResult.preferences.default_from_lang, defaultToLang: preferencesResult.preferences.default_to_lang };
          sessionStorage.setItem('authUser', JSON.stringify(updatedUser));
          setUser(updatedUser); // Update AuthContext user state
        } else {
          throw new Error(preferencesResult.error || `Failed to fetch updated preferences (Status: ${preferencesResponse.status})`);
        }
      } catch (err) {
        console.error('Error saving preferences:', err);
        setError(`Failed to save preferences. ${err.message}`);
      }
    } else {
      localStorage.setItem('guestDefaultFromLang', defaultFromLang);
      localStorage.setItem('guestDefaultToLang', defaultToLang);
      alert('Preferences saved locally for guest user!');
    }
  };

  // Handling Authentication, logs out the user and redirects them to the home screen
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Error during sign out:', err);
      setError('Failed to sign out.');
    }
  };
  // Closes AuthScreen and forces a re-render on auth success
  const handleAuthSuccess = () => {
    console.log('Auth success callback triggered, user:', user);
    setShowAuth(false);
    setRenderKey(prev => prev + 1);
  };

  if (showAuth) {
    return <AuthScreen onCancel={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" key={renderKey}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl text-indigo-600 dark:text-indigo-400">
                {user ? user.email.charAt(0).toUpperCase() : 'G'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {user ? user.email : 'Guest User'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {user ? 'Your saved translations' : 'Sign in to access more features'}
            </p>

            <div className="w-full mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Source Language
                </label>
                <LanguageSearch value={defaultFromLang} onChange={setDefaultFromLang} placeholder="Select language" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Target Language
                </label>
                <LanguageSearch value={defaultToLang} onChange={setDefaultToLang} placeholder="Select language" />
              </div>
              <button onClick={savePreferences} className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                Save Preferences
              </button>
              {user ? (
                <button onClick={handleSignOut} className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                  Sign Out
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Translation History */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Translation History</h2>
          </div>

          <div className="flex space-x-2 mb-6">
            <button onClick={() => setActiveTab('text')} className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'text' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
              Text
            </button>
            {user && (
              <button onClick={() => setActiveTab('voice')} className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'voice' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
                Voice
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : translations && Array.isArray(translations) && translations.length > 0 ? (
            <div>
              {translations.map((t, index) => {
                // Use different keys based on whether the user is logged in (database) or guest (localStorage)
                const fromLang = user ? t.from_lang : t.fromLang;
                const toLang = user ? t.to_lang : t.toLang;
                const originalText = user ? t.original_text : t.originalText;
                const translatedText = user ? t.translated_text : t.translatedText;

                if (
                  !fromLang || !toLang || !originalText || !translatedText ||
                  typeof fromLang !== 'string' || fromLang.trim() === '' ||
                  typeof toLang !== 'string' || toLang.trim() === '' ||
                  typeof originalText !== 'string' || originalText.trim() === '' ||
                  typeof translatedText !== 'string' || translatedText.trim() === ''
                ) {
                  return null;
                }
                return (
                  <div key={index} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
                    <p className="text-sm text-gray-800 dark:text-gray-100"><strong>{fromLang} → {toLang}:</strong> {originalText}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{translatedText}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No translations found</div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;