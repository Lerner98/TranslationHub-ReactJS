import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import NavigationBar from './components/NavigationBar';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { useThemeStore } from './store/themeStore';

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  return (
    <AuthProvider>
      <div className={isDarkMode ? 'dark' : ''}>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <NavigationBar />
            <main className="container mx-auto px-4 py-8">
              <AppNavigator />
            </main>
          </div>
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;