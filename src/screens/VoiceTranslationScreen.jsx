/*
Voice Translation Screen component, enables voice-based translations in TranslationHub.
provides mic recording & transcription to text via transcribeAudio function
text translation via translateText
saving translations to db for logged-in users, localStorage for guests
limits guest users to 20 saved translations
*/

// Imports & Dependencies
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Save } from 'lucide-react';
import LanguageSearch from '../components/LanguageSearch';
import { transcribeAudio } from '../services/speechService'; // used to convert recorded audio into text
import { translateText } from '../services/translationService';
import { useAuth } from '../context/AuthContext'; // fetches the user state (user, sessionId)
import { useTranslationStore } from '../store/translationStore'; // stores translation history

// State Management
const VoiceTranslationScreen = () => {
  const { user } = useAuth();
  const addTranslation = useTranslationStore((state) => state.addTranslation);

  const [isRecording, setIsRecording] = useState(false); // tracks if the user is currently recording
  const [audioBlob, setAudioBlob] = useState(null); 
  const [transcribedText, setTranscribedText] = useState(''); // speech to text result
  const [translatedText, setTranslatedText] = useState(''); // translated version of the text
  const [fromLang, setFromLang] = useState('');
  const [toLang, setToLang] = useState('');
  const [loading, setLoading] = useState(false); // tracks api processing state
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false); // tracks if the translation was saved

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);

  /*
  Syncing User Preferences on Login:
  loads default languages from user preferences or local storage
  ensures sync when a user logs in or out
  */
  useEffect(() => {
    if (user) {
      console.log('VoiceTranslationScreen - User preferences:', user.defaultFromLang, user.defaultToLang); // Debug log
      setFromLang(user.defaultFromLang || ''); // Explicitly set to empty if undefined
      setToLang(user.defaultToLang || '');    // Explicitly set to empty if undefined
    } else {
      setFromLang(localStorage.getItem('guestDefaultFromLang') || '');
      setToLang(localStorage.getItem('guestDefaultToLang') || '');
    }
  }, [user]);

  /*
  Starting & Stopping Recording:
  requests mic access using nav.mediaDevices.getUserMedia
  uses MediaRecorder to record audio
  on stop, processes the recorded audio file(blob) and sends it for transcription
  */
  const startRecording = async () => {
    try {
      setError(null);
      setTranscribedText('');
      setTranslatedText('');
      setAudioBlob(null);
      setIsSaved(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      audioSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
          setAudioBlob(blob);
          await processAudio(blob);
        } catch (err) {
          setError('Failed to process audio. Please try again.');
          console.error('Audio processing error:', err);
        }
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied. Please enable microphone permissions.');
      console.error('Recording error:', err);
    }
  };

  // Uses `MediaRecorder` for audio capture. Stops streams on stop—ensure browser permissions are handled.
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

      if (audioSourceRef.current) audioSourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();

      setIsRecording(false);
    }
  };

  /*
  Transcribing & Translating Audio:
  calls transcribeAudio function to convert speech into text
  calls translateText function to translate it
  saves translation for guests in localStorage
  */
  const processAudio = async (blob) => {
    setLoading(true);
    try {
      const text = await transcribeAudio(blob, fromLang);
      setTranscribedText(text);

      const translated = await translateText(text, toLang.split('-')[0], fromLang.split('-')[0]);
      setTranslatedText(translated);

      if (!user) {
        const savedTranslations = JSON.parse(localStorage.getItem('guestTranslations') || '[]');
        if (savedTranslations.length >= 20) {
          setError('Guest limit reached: Maximum 20 translations.');
          return;
        }
        const newTranslation = {
          id: Date.now().toString(),
          type: 'voice',
          fromLang,
          toLang,
          originalText: text,
          translatedText: translated,
          timestamp: new Date(),
        };
        savedTranslations.push(newTranslation);
        localStorage.setItem('guestTranslations', JSON.stringify(savedTranslations));
        addTranslation(newTranslation);
      }
    } catch (err) {
      setError('Transcription or translation failed. Please try again.');
      console.error('Transcription/translation error:', err);
    } finally {
      setLoading(false);
    }
  };

  /*
  Saving Translations (Logged-in Users): 
  saves translations to the server for logged-in users
  ensures fromlang and tolang are valid
  handles API failures
  */
  const saveToServer = async () => {
    if (!user) {
      setError('Please log in to save translation.');
      return;
    }

    if (!translatedText || isSaved) return;

    // Validate fromLang and toLang before sending
    if (!fromLang || !toLang) {
      setError('Please select both source and target languages.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/translation/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.signed_session_id}`, // Use signed_session_id for authentication
        },
        body: JSON.stringify({
          userId: user.id,
          fromLang, // Match server expected key
          toLang,   // Match server expected key
          originalText: transcribedText,
          translatedText: translatedText,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save translation to server');
      }

      setIsSaved(true);
      alert('Translation saved successfully!');
    } catch (err) {
      setError('Failed to save translation. Please try again.');
      console.error('Save translation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="w-[45%]">
              <LanguageSearch
                value={fromLang}
                onChange={setFromLang}
                placeholder="Source language"
              />
            </div>
            <div className="w-[45%]">
              <LanguageSearch
                value={toLang}
                onChange={setToLang}
                placeholder="Target language"
              />
            </div>
          </div>
          <div className="flex flex-col items-center space-y-6">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`p-8 rounded-full transition-all duration-300 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : isRecording ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
            </p>
          </div>
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}
          {(transcribedText || translatedText) && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Transcription and Translation
              </h3>
              {transcribedText && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Transcribed Text ({fromLang}):</p>
                  <p className="text-gray-700 dark:text-gray-300">{transcribedText}</p>
                </div>
              )}
              {translatedText && (
                <div className="mt-4">
                  <p className="text-gray-500 dark:text-gray-400">Translated Text ({toLang}):</p>
                  <p className="text-gray-700 dark:text-gray-300">{translatedText}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 mt-6">
                {translatedText && user && (
                  <button
                    onClick={saveToServer}
                    disabled={loading || isSaved}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white ${
                      loading || isSaved ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaved ? 'Saved' : 'Save to Profile'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceTranslationScreen;