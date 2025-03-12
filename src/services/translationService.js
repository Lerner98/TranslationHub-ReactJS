/**
 * Translation Service
 *
 * Automatically switches between DEVELOPMENT (mock) and PRODUCTION (API).
 *
 * Required API Keys (in .env):
 * - VITE_GOOGLE_TRANSLATE_API_KEY
 * - VITE_USE_MOCK_API (set to false to use real API calls)
 */

import axios from 'axios';

const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const IS_DEV = import.meta.env.VITE_USE_MOCK_API === 'true';

// ============= MOCK IMPLEMENTATION =============
const mockLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' }
];

const mockTranslateText = async (text, targetLang) => {
  console.warn('⚠️ Using mock translation service');
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `[Mock Translation] ${text} (to ${targetLang})`;
};

const mockDetectLanguage = async () => {
  console.warn('⚠️ Using mock language detection');
  await new Promise(resolve => setTimeout(resolve, 500));
  return 'en';
};

const mockFetchLanguages = async (query = '') => {
  console.warn('⚠️ Using mock language service');
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockLanguages.filter(lang =>
    !query || lang.name.toLowerCase().includes(query.toLowerCase())
  );
};

// ============= PRODUCTION IMPLEMENTATION =============
const fetchLanguagesAPI = async (query = '') => {
  const response = await axios.get(`${GOOGLE_TRANSLATE_API_URL}/languages`, {
    params: {
      key: GOOGLE_TRANSLATE_API_KEY,
      target: 'en',
      q: query
    }
  });

  return response.data.data.languages.map(lang => ({
    code: lang.language,
    name: lang.name
  }));
};

const translateTextAPI = async (text, targetLang, sourceLang = 'auto') => {
  const response = await axios.post(`${GOOGLE_TRANSLATE_API_URL}`, null, {
    params: {
      q: text,
      target: targetLang,
      source: sourceLang,
      key: GOOGLE_TRANSLATE_API_KEY
    }
  });

  return response.data.data.translations[0].translatedText;
};

const detectLanguageAPI = async (text) => {
  const response = await axios.post(`${GOOGLE_TRANSLATE_API_URL}/detect`, null, {
    params: {
      q: text,
      key: GOOGLE_TRANSLATE_API_KEY
    }
  });

  return response.data.data.detections[0][0].language;
};

// ✅ Auto-Switch Between Mock & Production
export const fetchLanguages = IS_DEV ? mockFetchLanguages : fetchLanguagesAPI;
export const translateText = IS_DEV ? mockTranslateText : translateTextAPI;
export const detectLanguage = IS_DEV ? mockDetectLanguage : detectLanguageAPI;