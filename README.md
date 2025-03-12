# TranslationHub-ReactJS

A React-based application for translation services, supporting text, voice, and file translations. Built with Vite, Tailwind CSS, and React.

## Features
- Text translation
- Voice translation
- File translation
- User authentication

--------------------------------------------------------------------------------------

## Installation
1. Clone the repository:

git clone https://github.com/Lerner98/TranslationHub-ReactJS.git

2. Install dependencies:
npm install

3. Start the backend server (in a separate terminal):
cd src/services node server.js

4. Start the frontend:

npm run dev



--------------------------------------------------------------------------------------


## File Overview
- **`src/App.jsx`:** Main React component that sets up the application layout and routing.
- **`src/context/AuthContext.jsx`:** Manages user authentication state and provides sign-in, sign-up, and sign-out functionality.
- **`src/screens/AuthScreen.jsx`:** Handles user login and registration with form validation.
- **`src/screens/ProfileScreen.jsx`:** Displays user profile, preferences, and translation history.
- **`src/screens/TextTranslationScreen.jsx`:** Provides the interface for text translation with language selection and save options.
- **`src/components/LanguageSearch.jsx`:** Reusable component for searching and selecting languages.
- **`src/services/database.js`:** Contains database logic for user management, translations, and preferences (mock and production modes).
- **`src/services/server.js`:** Sets up the Express server with API endpoints for the application.
- **`src/services/translationService.js`:** Handles translation API calls (mock or Google Translate API).
- **`.env` (not included):** Stores environment variables like database credentials and API keys (create locally and add to `.gitignore`).

