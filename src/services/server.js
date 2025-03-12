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

// Validation functions for email and password
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    return passwordRegex.test(password);
};

// Set up multer for file uploads (not used for STT but kept for compatibility)
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// Serve uploaded files statically (not used but kept for compatibility)
app.use('/uploads', express.static('uploads'));

// Authentication middleware
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const sessionId = authHeader.split(' ')[1];
    const isValid = await validateSession(sessionId);
    if (!isValid) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session' });
    }

    req.sessionId = sessionId;
    next();
};

// ✅ Register User API
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
});

// ✅ Login User API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await loginUser(email, password);
        res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

// ✅ Logout User API
app.post('/api/logout', authenticate, async (req, res) => {
    const { sessionId } = req;
    try {
        const result = await logoutUser(sessionId);
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
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

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