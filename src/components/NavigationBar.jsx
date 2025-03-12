import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe2, Mic, FileText, Languages, User, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const navigationItems = [
    { name: 'Text Translation', icon: Globe2, path: '/translate' },
    { name: 'Voice Translation', icon: Mic, path: '/voice' },
    { name: 'File Translation', icon: FileText, path: '/file' },
    { name: 'ASL Translation', icon: Languages, path: '/asl' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  const isActive = (path) => location.pathname.startsWith(path); // ✅ Fix: Supports query params & nested paths

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg" role="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 cursor-pointer focus:outline-none"
            aria-label="Go to Home"
          >
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              TranslationHub
            </h1>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none ${
                      isActive(item.path)
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center p-2 rounded-lg focus:outline-none ${
                  isActive(item.path)
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={`Go to ${item.name}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
