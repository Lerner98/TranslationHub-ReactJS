import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe2, Mic, FileText, Languages } from 'lucide-react';

const HomeScreen = () => {
  const navigate = useNavigate();

  const navigationItems = [
    { name: 'Text Translation', icon: Globe2, route: '/translate', description: 'Translate text between multiple languages instantly' },
    { name: 'Voice Translation', icon: Mic, route: '/voice', description: 'Convert speech to text and translate in real-time' },
    { name: 'File Translation', icon: FileText, route: '/file', description: 'Translate documents while preserving formatting' },
    { name: 'ASL Translation', icon: Languages, route: '/asl', description: 'Translate between sign language and text' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="relative mb-8 rounded-xl overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80"
              alt="Digital Global Communication"
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/80 to-blue-600/80 flex items-center justify-center">
              <div className="text-white max-w-2xl px-6">
                <h1 className="text-5xl font-bold mb-4">TranslationHub</h1>
                <p className="text-xl text-gray-100">
                  Breaking language barriers with comprehensive translation tools. 
                  Connect, communicate, and collaborate seamlessly across cultures.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.route)}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors duration-300">
                    <Icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    {item.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;