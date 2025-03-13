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

  // Converts `audioBlob` to base64 for API, Using FileReader(browser compatible)  Critical for Google Speech API—ensure encoding matches (`WEBM_OPUS`).
  const base64Audio = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1]; // Remove the data URL prefix
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const requestBody = {
    config: {
      encoding: 'WEBM_OPUS', // Match the actual encoding (WEBM OPUS)
      languageCode: language.split('-')[0], // e.g., 'he' from 'he-IL'
      // Removed sampleRateHertz to let API detect it
    },
    audio: {
      content: base64Audio,
    },
  };

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