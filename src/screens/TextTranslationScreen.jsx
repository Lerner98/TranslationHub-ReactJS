import React, { useState, useEffect } from 'react';
import { Repeat, Copy, History, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LanguageSearch from '../components/LanguageSearch';
import { translateText } from '../services/translationService';
import { useAuth } from '../context/AuthContext';

const TextTranslationScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fromLang, setFromLang] = useState(
    user ? (user.defaultFromLang || '') : (localStorage.getItem('guestDefaultFromLang') || '')
  );
  const [toLang, setToLang] = useState(
    user ? (user.defaultToLang || '') : (localStorage.getItem('guestDefaultToLang') || '')
  );
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('TextTranslationScreen - User preferences:', user.defaultFromLang, user.defaultToLang); // Debug log
      // Only update if user preferences are explicitly set or empty
      setFromLang(user.defaultFromLang !== undefined ? user.defaultFromLang : '');
      setToLang(user.defaultToLang !== undefined ? user.defaultToLang : '');
    } else {
      setFromLang(localStorage.getItem('guestDefaultFromLang') || '');
      setToLang(localStorage.getItem('guestDefaultToLang') || '');
    }
  }, [user]);

  const handleSwapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
    setIsSaved(false);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    if (!fromLang || !toLang) {
      setError('Please select both source and target languages.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsSaved(false);

    try {
      const result = await translateText(inputText, toLang, fromLang);
      setTranslatedText(result);
    } catch (err) {
      setError('Translation failed. Please try again.');
      console.error('Translation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSaveTranslation = async () => {
    if (!translatedText.trim()) return;

    console.log('Saving translation - fromLang:', fromLang, 'toLang:', toLang);
    if (!fromLang || !toLang) {
      setError('Please select both source and target languages.');
      return;
    }

    if (user) {
      const response = await fetch('http://localhost:5000/api/translation/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.session_id}` },
        body: JSON.stringify({
          userId: user.id,
          fromLang,
          toLang,
          originalText: inputText,
          translatedText: translatedText,
        }),
      });
      const saveResult = await response.json();
      if (saveResult.success) {
        setIsSaved(true);
        alert('Translation saved successfully!'); // Add confirmation message
      } else {
        setError(saveResult.error || 'Failed to save translation');
      }
    } else {
      const savedTranslations = JSON.parse(localStorage.getItem('guestTranslations') || '[]');
      if (savedTranslations.length >= 20) {
        setError('Guest limit reached: Maximum 20 translations.');
        return;
      }
      const newTranslation = {
        id: Date.now().toString(),
        fromLang,
        toLang,
        originalText: inputText,
        translatedText: translatedText,
        timestamp: new Date(),
      };
      savedTranslations.push(newTranslation);
      localStorage.setItem('guestTranslations', JSON.stringify(savedTranslations));
      setIsSaved(true);
      alert('Translation saved successfully!'); // Add confirmation message for guest
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="w-48">
            <LanguageSearch
              value={fromLang}
              onChange={setFromLang}
              placeholder="From language"
            />
          </div>
          <button
            onClick={handleSwapLanguages}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Repeat className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="w-48">
            <LanguageSearch
              value={toLang}
              onChange={setToLang}
              placeholder="To language"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-48 p-4 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => handleCopyText(inputText)}
              className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <div className="relative">
            <textarea
              value={translatedText}
              readOnly
              placeholder="Translation will appear here..."
              className="w-full h-48 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => handleCopyText(translatedText)}
              className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={handleTranslate}
            disabled={loading || !inputText.trim()}
            className={`px-6 py-2 rounded-lg text-white font-medium ${
              loading || !inputText.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? 'Translating...' : 'Translate'}
          </button>
          <div className="flex space-x-4">
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <History className="w-4 h-4" />
                <span>View History</span>
              </button>
            )}
            <button
              onClick={handleSaveTranslation}
              disabled={isSaved || !translatedText.trim()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white ${
                isSaved || !translatedText.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaved ? 'Saved' : 'Save Translation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextTranslationScreen;