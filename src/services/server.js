/*
Server.js Overview:
This Node.js Express server acts as the backend for the Translation Hub application.
It provides REST API endpoints for:

🟢 User Authentication (Register, Login, Logout).
🔒 Session Validation (validateSession middleware for security).
📜 Text & Voice Translation Management (Saving & Fetching History).
⚙️ User Preferences Management (Languages, Settings).
🗂 File Uploads Handling (Not actively used but included for compatibility).
🌍 CORS Support (Allows cross-origin requests).
*/


/*
Express App Initialization:
Express is used for creating the API.
CORS is enabled to allow frontend requests.
JSON body parsing (express.json()) ensures structured request handling.
*/

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import {
    registerUser,
    loginUser,
    logoutUser,
    saveTextTranslation,
    getTextTranslationHistory,
    saveVoiceTranslation,
    getVoiceTranslationHistory,
    validateSession,
    updateUserPreferences,
    getUserPreferences,
} from './database.js';

dotenv.config();

// Add debug log to confirm server startup with GET endpoint
console.log('Server starting with GET /api/user/preferences/:userId endpoint defined');

const app = express();
app.use(express.json());
app.use(cors());

/*
Input Validation Functions
validateEmail ensures the email format is correct.
validatePassword enforces strong password rules:
minimum 8 characters.
at least 1 uppercase letter.
at least 1 special character.
*/

// Validation functions for email and password
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    return passwordRegex.test(password);
};

/*
File Uploads (Multer)
Multer is configured for handling file uploads.
Uploads are stored in the /uploads directory.
Static serving is enabled for uploaded files.
Not currently used but retained for future compatibility.
*/
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

app.use('/uploads', express.static('uploads'));

/*
Authentication Middleware (authenticate)
Extracts signedSessionId from Authorization header.
Validates session using validateSession from database.js.
If invalid, returns 401 Unauthorized.
*/
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const signedSessionId = authHeader.split(' ')[1];
    const isValid = await validateSession(null, signedSessionId); // Pass null for sessionId, validate with signedSessionId
    if (!isValid) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session' });
    }

    req.signedSessionId = signedSessionId;
    next();
}; // Checks for a valid Bearer token and session. Essential for securing all protected routes after ensuring `validateSession` in `database.js` is correctly implemented.


/*
User Authentication Endpoints
Register User (/api/register)
Validates input (email & password).
Calls registerUser from database.js to store new user.
Returns success or error message.
*/
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long, contain at least one uppercase letter, and one special character' });
    }

    try {
        const result = await registerUser(email, password);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error during registration' });
    }
}); // Validates email and password with regex before calling `registerUser`. Critical for security—update regex if password rules change.

/*
Login User (/api/login)
Checks credentials via loginUser.
Returns session_id for future authentication.
*/
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await loginUser(email, password);
        res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

/*
Logout User (/api/logout)
Requires authentication (uses authenticate middleware).
Deletes the session from the database.
*/
app.post('/api/logout', authenticate, async (req, res) => {
    const { signedSessionId } = req;
    try {
        const result = await logoutUser(signedSessionId);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error during logout' });
    }
});

// ✅ Save Text Translation API
app.post('/api/translation/text', authenticate, async (req, res) => {
    const { userId, fromLang, toLang, originalText, translatedText } = req.body;
    try {
        const result = await saveTextTranslation(userId, fromLang, toLang, originalText, translatedText);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error saving text translation' });
    }
});

// ✅ Get Text Translation History API
app.get('/api/translation/text/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await getTextTranslationHistory(userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error fetching text translation history' });
    }
});

// ✅ Save Voice Translation API (STT-based, text only)
app.post('/api/translation/voice', authenticate, async (req, res) => {
    const { userId, fromLang, toLang, originalText, translatedText } = req.body;
    try {
        const result = await saveVoiceTranslation(userId, fromLang, toLang, originalText, translatedText);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error saving voice translation' });
    }
});

// ✅ Get Voice Translation History API
app.get('/api/translation/voice/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await getVoiceTranslationHistory(userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error fetching voice translation history' });
    }
});

// ✅ Update User Preferences API
app.post('/api/user/preferences', authenticate, async (req, res) => {
    const { userId, default_from_lang, default_to_lang } = req.body;
    if (!userId || !default_from_lang || !default_to_lang) {
      return res.status(400).json({ success: false, error: 'All fields are required: userId, default_from_lang, default_to_lang' });
    }
    try {
        const result = await updateUserPreferences(userId, default_from_lang, default_to_lang);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error updating preferences' });
    }
});

// ✅ Get User Preferences API
app.get('/api/user/preferences/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;
    try {
        const preferences = await getUserPreferences(userId);
        res.status(200).json({ success: true, preferences });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`)); // Starts server on `PORT` (default 5000). Ensure `.env` has `PORT` defined if overriding the default.

/**
 * 🚀 Translation Hub Backend Server Setup 🚀
 * 
 * 📌 How to Start the Server:
 * 1️⃣ Open a terminal and navigate to the project folder.
 * 2️⃣ Move into the backend service directory:
 *     cd src/services
 * 3️⃣ Start the server:
 *     node server.js
 * 
 * ✅ If you see "Server running on port 5000", the backend is running successfully.
 * 
 * 📌 Next Step:
 * - Open a new terminal and return to the root project folder.
 * - Start the frontend:
 *     npm run dev
 * 
 * 🔍 Notes:
 * - Make sure you have all dependencies installed: `npm install`
 * - Check the `.env` file to configure the database connection.
 * - If using the mock database, set `USE_MOCK_DB=true` in `.env`
 * 
 * 🛠 If any issues arise, verify logs in the terminal and ensure Node.js is installed.
 */