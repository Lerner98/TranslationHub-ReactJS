/**
 * Translation Service
 *
 * Automatically switches between DEVELOPMENT (mock) and PRODUCTION (API).
 *
 * Requires API Keys (in .env):
 * - VITE_GOOGLE_TRANSLATE_API_KEY
 * - VITE_USE_MOCK_API (set to false to use real API calls)
 */


import axios from 'axios'; // used for making HTTP requests to google API

const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2'; // base URL for google translate API
const IS_DEV = import.meta.env.VITE_USE_MOCK_API === 'true';

// ============= MOCK IMPLEMENTATION =============
const mockLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' }
];
/*
Mock Translation Function:
Simulates translation/detection with delays, mainly for development
*/
const mockTranslateText = async (text, targetLang) => {
  console.warn('⚠️ Using mock translation service'); // warning log to indicate mock data is used
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `[Mock Translation] ${text} (to ${targetLang})`;
};

/*
Mock Language Detection (for dev with no api's):
used to simulate the language of a given text,
always returns 'en' after 0.5 second delay
*/
const mockDetectLanguage = async () => {
  console.warn('⚠️ Using mock language detection');
  await new Promise(resolve => setTimeout(resolve, 500));
  return 'en';
};
// Simulates translation fetching with delays, for development
const mockFetchLanguages = async (query = '') => {
  console.warn('⚠️ Using mock language service');
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockLanguages.filter(lang =>
    !query || lang.name.toLowerCase().includes(query.toLowerCase())
  );
};

// ============= PRODUCTION IMPLEMENTATION =============

/*
Uses Google Translate API with `axios`. Supports auto-detection (`source: auto`)
filters the results based on the query string, returns an array of {code, name} objs
*/
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

/*
TranslateText (API):
sends a translation request to google API
uses auto-detection for source
extracts and returns translated text
*/
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

 /*
 DetectLanguage (API):
 detects the language of the input text using google API
 returns the detected language code (for example 'en' for english)
 */
const detectLanguageAPI = async (text) => {
  const response = await axios.post(`${GOOGLE_TRANSLATE_API_URL}/detect`, null, {
    params: {
      q: text,
      key: GOOGLE_TRANSLATE_API_KEY
    }
  });

  return response.data.data.detections[0][0].language;
};

// Auto-Switch Between Mock & Production
// Switches based on `IS_DEV`, true = mock data / false = google api's
export const fetchLanguages = IS_DEV ? mockFetchLanguages : fetchLanguagesAPI;
export const translateText = IS_DEV ? mockTranslateText : translateTextAPI;
export const detectLanguage = IS_DEV ? mockDetectLanguage : detectLanguageAPI;