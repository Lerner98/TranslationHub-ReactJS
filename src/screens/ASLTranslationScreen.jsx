import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Download } from 'lucide-react';

const ASLTranslationScreen = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && isStreaming) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const mockTranslation = 'Sample ASL translation';
        setTranslations(prev => [mockTranslation, ...prev].slice(0, 50));
      }
    }
  };

  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(captureFrame, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ display: isStreaming ? 'block' : 'none' }}
              />
              <canvas
                ref={canvasRef}
                width="640"
                height="480"
                className="hidden"
              />
              {!isStreaming && (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={isStreaming ? stopCamera : startCamera}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white
                    ${isStreaming ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}
                  `}
                >
                  {isStreaming ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Stop Camera</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Start Camera</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Live Translations
              </h2>
              <button
                onClick={() => {
                  const text = translations.join('\n');
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'asl-translations.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
            <div className="h-[600px] overflow-y-auto">
              {translations.length > 0 ? (
                <div className="space-y-2">
                  {translations.map((text, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  Translations will appear here when you start the camera
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ASLTranslationScreen;