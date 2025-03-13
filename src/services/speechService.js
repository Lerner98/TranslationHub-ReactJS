/*
Speech-to-Text (STT) API (Google Speech) - Overview
This JavaScript module provides Speech-to-Text (STT) transcription using the Google Cloud Speech API.
It can convert recorded audio into text dynamically, supporting:

✅ Google Speech API (Production Mode)
⚠️ Mock Transcription Mode (Development Mode)
🎙 Automatic Language Detection (Based on provided language code)
🔄 Handles Errors & API Rate Limits (Prevents crashes)
📁 Base64 Encoding for Audio Data (Google API requires this format)
*/


/*
Environment & Configuration
Google Speech API Key is imported from .env (VITE_GOOGLE_SPEECH_API_KEY).
Mock mode (VITE_USE_MOCK_API) allows testing without actual API calls.
Axios is used for HTTP requests.
*/
import axios from 'axios';

const GOOGLE_SPEECH_API_KEY = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY;
const isMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const transcribeAudio = async (audioBlob, language = 'en-US') => {
  console.log('isMock value:', isMock); // Debug: Confirm mock mode
  if (isMock) {
    console.warn('⚠️ Using mock speech recognition');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "This is a sample transcription of your voice recording.";
  }  // Returns mock text with 1s delay.  for development—update mock for realistic testing

  /*
  Audio File Conversion (Base64 Encoding)
  Google Speech API requires Base64-encoded audio data.
  Uses FileReader (browser-compatible) to convert Blob audio into Base64.
  Removes the "data:" prefix before sending it to the API.
  */
  const base64Audio = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1]; // Remove the data URL prefix
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  /*
  Google Speech API Request Setup
  Defines STT request configuration:
  Encoding: WEBM_OPUS (matches browser recordings).
  Language Code Extraction: Converts "en-US" → "en", "he-IL" → "he".
  No Sample Rate Specification (Google API automatically detects it).
  */
  const requestBody = {
    config: {
      encoding: 'WEBM_OPUS', // Match the actual encoding 
      languageCode: language.split('-')[0], 
    },
    audio: {
      content: base64Audio,
    },
  };

  /*
  Calling the Google Speech API
  Axios makes a POST request to Google’s STT API.
  Passes API Key dynamically.
  Handles potential API rate limits (429 Too Many Requests).
  */
  // Uses Google Speech API with dynamic language. Handle 429 (rate limit) errors—check API key/quota.
  try {
    const response = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_API_KEY}`,
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('STT API Response:', response.data);
    if (!response.data.results || !response.data.results[0] || !response.data.results[0].alternatives || !response.data.results[0].alternatives[0]) {
      throw new Error('Invalid response structure from STT API');
    }
    return response.data.results[0].alternatives[0].transcript;
  } catch (error) {
    console.error('STT API Error:', error.response ? error.response.data : error.message);
    const errorMessage = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to transcribe audio via API: ${errorMessage}`);
  }
};