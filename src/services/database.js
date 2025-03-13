/*
The node.js database service handles user authentication (register/login/logout)
Loads environment variables from .env, ensuring secure database credential access.
Dynamically resolves the .env file path using path and fileURLToPath.
session validation
storing translations
fetching translation history
updating and retrieving user preferences
mock database mode for development using USE_MOCK_DB toggle
*/

// Key Dependencies
import sql from 'mssql'; // to connect to Microsoft SQL Server for our DB
import bcrypt from 'bcryptjs'; // to hash our passwords securely
import dotenv from 'dotenv'; // loads the db credentials from .env
import path from 'path'; // dynamic file paths handling
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // Added for session ID signing and UUID generation

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to the .env file (two levels up from src/services)
const envPath = path.resolve(__dirname, '../../.env');
console.log('Attempting to load .env file from:', envPath);

// Load .env file
dotenv.config({ path: envPath });

console.log('Loaded environment variables:', {
  DB_SERVER: process.env.DB_SERVER,
  DB_NAME: process.env.DB_NAME,
  USE_MOCK_DB: process.env.USE_MOCK_DB,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_EXPIRATION: process.env.SESSION_EXPIRATION,
});

const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

// Declare pool at the top level
let pool = null;

// Declare function variables for conditional assignment
let getPool, registerUser, loginUser, saveTextTranslation, getTextTranslationHistory, saveVoiceTranslation, getVoiceTranslationHistory, logoutUser, validateSession, updateUserPreferences, getUserPreferences;

// ==================== MOCK IMPLEMENTATION ====================
if (USE_MOCK_DB) {
  console.warn('⚠️ Using mock database service');

  const mockUsers = new Map();
  const mockTranslations = new Map();

  getPool = async () => null;

  registerUser = async (email, password) => {
    console.warn('⚠️ Using mock registration');
    const userId = crypto.randomUUID();
    mockUsers.set(email, { id: userId, email, password });
    return { success: true, user: { id: userId, email } };
  };

  loginUser = async (email, password) => {
    console.warn('⚠️ Using mock login');
    const user = mockUsers.get(email);
    if (!user) return { success: false, error: 'User not found' };
    const rawSessionId = crypto.randomUUID();
    const sessionId = rawSessionId; // Raw GUID for database
    const signedSessionId = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'default-secret')
                                 .update(rawSessionId)
                                 .digest('hex'); // Signed session ID, (HMAC-SHA256 with SESSION_SECRET)
    return { 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        session_id: sessionId,
        signed_session_id: signedSessionId 
      } 
    };
  };

  saveTextTranslation = async (userId, fromLang, toLang, originalText, translatedText) => {
    console.warn('⚠️ Using mock text translation storage');
    const id = crypto.randomUUID();
    const newTranslation = { id, userId, fromLang, toLang, originalText, translatedText, createdAt: new Date(), type: 'text' };
    mockTranslations.set(id, newTranslation);
    return newTranslation;
  };

  getTextTranslationHistory = async (userId) => {
    console.warn('⚠️ Using mock text translation history');
    return Array.from(mockTranslations.values())
      .filter(t => t.userId === userId && t.type === 'text')
      .sort((a, b) => b.createdAt - a.createdAt);
  };

  saveVoiceTranslation = async (userId, fromLang, toLang, originalText, translatedText) => {
    console.warn('⚠️ Using mock voice translation storage');
    const id = crypto.randomUUID();
    const newTranslation = {
      id,
      userId,
      fromLang,
      toLang,
      originalText,
      translatedText,
      createdAt: new Date(),
      type: 'voice'
    };
    mockTranslations.set(id, newTranslation);
    return { success: true, message: 'Voice translation saved', translation: newTranslation };
  };

  getVoiceTranslationHistory = async (userId) => {
    console.warn('⚠️ Using mock voice translation history');
    return Array.from(mockTranslations.values())
      .filter(t => t.userId === userId && t.type === 'voice')
      .sort((a, b) => b.createdAt - a.createdAt);
  };

  logoutUser = async (signedSessionId) => {
    console.warn('⚠️ Using mock logout with signedSessionId:', signedSessionId);
    return { success: true, message: 'Logged out successfully' };
  };

  validateSession = async (sessionId, signedSessionId) => {
    console.warn('⚠️ Using mock session validation with sessionId:', sessionId, 'signedSessionId:', signedSessionId);
    // Simulate validation by checking if signedSessionId matches the HMAC of sessionId
    const expectedSignedSessionId = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'default-secret')
                                         .update(sessionId)
                                         .digest('hex');
    return signedSessionId === expectedSignedSessionId;
  };

  updateUserPreferences = async (userId, defaultFromLang, defaultToLang) => {
    console.warn('⚠️ Using mock update user preferences');
    return { success: true, message: 'Preferences updated' };
  };

  getUserPreferences = async (userId) => {
    console.warn('⚠️ Using mock get user preferences');
    const user = Array.from(mockUsers.values()).find(u => u.id === userId);
    return { default_from_lang: user?.defaultFromLang || '', default_to_lang: user?.defaultToLang || '' };
  };
} else {
  // ==================== PRODUCTION IMPLEMENTATION ====================

  /*
  Database Configuration & Connection Handling:
  Uses sql.connect(dbConfig) to maintain a single persistent connection.
  Session security settings (SESSION_SECRET, SESSION_EXPIRATION) are also loaded
  */ 
  const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: 1433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: false,
      enableArithAbort: true,
      connectTimeout: 30000,
    },
  };

  console.log('Database config:', dbConfig);

  getPool = async () => {
    console.log('Attempting to connect to MSSQL Database with config:', dbConfig);
    if (!pool || !pool.connected) {
      try {
        pool = await sql.connect(dbConfig);
        console.log('✅ Connected to MSSQL Database');
      } catch (error) {
        console.error('❌ Database Connection Error:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
          originalError: error.originalError,
        });
        pool = null;
        throw new Error('Failed to connect to the database: ' + error.message);
      }
    }
    if (!pool) {
      throw new Error('Database pool is not initialized');
    }
    return pool;
  };

  /*
   User Authentication, Registering Users (registerUser):
   uses bcrypt to securely hash passwords before storing.
   calls the stored procedure spRegisterUser to insert a new user into the database.
   returns success/failure based on database execution.
  */
  registerUser = async (email, password) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request()
        .input('Email', sql.NVarChar, email)
        .input('PasswordHash', sql.NVarChar, passwordHash);

      await request.execute('spRegisterUser');
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      console.error('❌ Register Error:', error);
      return { success: false, error: error.message };
    }
  };

  /*
  Logging in Users (loginUser):
  retrieves hashed password from spLoginUser.
  uses bcrypt.compare() to verify the entered password.
  generates a UUID session ID (crypto.randomUUID()).
  signs session ID using HMAC (crypto.createHmac) for security.
  Stores session in spCreateSession along with:
  session_id
  signed_session_id
  expires_at (calculated based on SESSION_EXPIRATION).
  */
  loginUser = async (email, password) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request().input('Email', sql.NVarChar, email);

      const result = await request.execute('spLoginUser');
      if (result.recordset.length === 0) {
        return { success: false, error: 'Invalid email or password' };
      }

      const user = result.recordset[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return { success: false, error: 'Invalid email or password' };
      }

      const rawSessionId = crypto.randomUUID();
      const sessionId = rawSessionId; // Raw GUID for database
      const signedSessionId = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'default-secret')
                                   .update(rawSessionId)
                                   .digest('hex'); // Signed session ID
      const expiresAt = new Date(Date.now() + (parseInt(process.env.SESSION_EXPIRATION, 10) * 1000));
      await poolInstance.request()
        .input('UserId', sql.UniqueIdentifier, user.UserId)
        .input('SessionId', sql.UniqueIdentifier, sessionId)
        .input('ExpiresAt', sql.DateTime, expiresAt)
        .input('SignedSessionId', sql.NVarChar(64), signedSessionId)
        .execute('spCreateSession');

      return { 
        success: true, 
        user: { 
          id: user.UserId, 
          email: user.email, 
          session_id: sessionId,
          signed_session_id: signedSessionId,
          default_from_lang: user.default_from_lang,
          default_to_lang: user.default_to_lang 
        } 
      };
    } catch (error) {
      console.error('❌ Login Error:', error);
      return { success: false, error: error.message };
    }
  };
  /*
  Logging Out Users (logoutUser):
  deletes session from the Sessions table using signed_session_id.
  prevents unauthorized access by invalidating stored session tokens.
  */
  logoutUser = async (signedSessionId) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      await poolInstance.request()
        .input('SignedSessionId', sql.NVarChar(64), signedSessionId)
        .query('DELETE FROM Sessions WHERE signed_session_id = @SignedSessionId');
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('❌ Logout Error:', error);
      return { success: false, error: error.message };
    }
  };

  /*
  Storing and Fetching Translations:
  save Text Translation (saveTextTranslation)
  stores original and translated text in the database.
  calls spSaveTextTranslation.
  */
  saveTextTranslation = async (userId, fromLang, toLang, originalText, translatedText) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request()
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('FromLang', sql.NVarChar, fromLang)
        .input('ToLang', sql.NVarChar, toLang)
        .input('OriginalText', sql.NVarChar, originalText)
        .input('TranslatedText', sql.NVarChar, translatedText);

      await request.execute('spSaveTextTranslation');
      return { success: true, message: 'Translation saved' };
    } catch (error) {
      console.error('❌ Save Text Translation Error:', error);
      return { success: false, error: error.message };
    }
  };

  /*
  Fetching Translation History
  get Text Translation History (getTextTranslationHistory)
  retrieves text translations stored in the database.
  */
  getTextTranslationHistory = async (userId) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request().input('UserId', sql.UniqueIdentifier, userId);

      const result = await request.execute('spGetUserTextTranslations');
      return result.recordset;
    } catch (error) {
      console.error('❌ Get Text Translation History Error:', error);
      return { success: false, error: error.message };
    }
  };
  /*
  Storing and Fetching Translations:
  save Voice Translation (saveVoiceTranslation)
  stores translated text in the database.
  calls spSaveVoiceTranslation.
  */
  saveVoiceTranslation = async (userId, fromLang, toLang, originalText, translatedText) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request()
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('FromLang', sql.NVarChar, fromLang)
        .input('ToLang', sql.NVarChar, toLang)
        .input('OriginalText', sql.NVarChar, originalText)
        .input('TranslatedText', sql.NVarChar, translatedText);

      await request.execute('spSaveVoiceTranslation');
      return { success: true, message: 'Voice translation saved' };
    } catch (error) {
      console.error('❌ Save Voice Translation Error:', error);
      return { success: false, error: error.message };
    }
  };

  /*
  Fetching Voice Translation History (getVoiceTranslationHistory)
  retrieves all stored voice translations for a user.
  calls stored procedure spGetUserVoiceTranslations.
  ensures database connection before executing the query. 
  returns list of previous voice translations.
  */
  getVoiceTranslationHistory = async (userId) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request().input('UserId', sql.UniqueIdentifier, userId);

      const result = await request.execute('spGetUserVoiceTranslations');
      return result.recordset;
    } catch (error) {
      console.error('❌ Get Voice Translation History Error:', error);
      return { success: false, error: error.message };
    }
  };

  /*
  Session Validation (validateSession)
  verifies session authenticity using signedSessionId.
  calls stored procedure spValidateSession.
  prevents unauthorized access by checking:
  session expiration.
  signed session ID (HMAC signature verification).
  logs session validation attempts.
  */
  validateSession = async (sessionId, signedSessionId) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request()
        .input('SignedSessionId', sql.NVarChar(64), signedSessionId);
      console.log(`Validating session with SignedSessionId: ${signedSessionId}`);
      const result = await request.execute('spValidateSession');
      console.log('Validate session result:', result.recordset);
      return result.recordset.length > 0; // Checks expiration and signed_session_id via updated `spValidateSession`.
    } catch (error) {
      console.error('❌ Validate Session Error:', {
        message: error.message,
        stack: error.stack,
        originalError: error.originalError,
      });
      return false;
    }
  };

  /*
  Updating User Preferences (updateUserPreferences)
  updates user language preferences (default_from_lang, default_to_lang).
  calls stored procedure spUpdateUserPreferences.
  if no rows are affected, it means:
  the user does not exist, OR
  no actual changes were made to the preferences.
  logs all update attempts.
  */
  updateUserPreferences = async (userId, defaultFromLang, defaultToLang) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request()
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('DefaultFromLang', sql.NVarChar, defaultFromLang)
        .input('DefaultToLang', sql.NVarChar, defaultToLang);
  
      console.log(`Executing spUpdateUserPreferences with UserId: ${userId}, DefaultFromLang: ${defaultFromLang}, DefaultToLang: ${defaultToLang}`);
      const result = await request.execute('spUpdateUserPreferences');
      console.log('spUpdateUserPreferences result:', result);
      console.log('Rows affected:', result.rowsAffected);
      if (result.rowsAffected[0] === 0) {
        throw new Error('No rows updated - User not found or no change detected');
      }
      const updatedUser = await getUserPreferences(userId);
      return { success: true, message: 'Preferences updated', user: updatedUser };
    } catch (error) {
      console.error('❌ Update User Preferences Error:', {
        message: error.message,
        stack: error.stack,
        originalError: error.originalError,
      });
      return { success: false, error: error.message };
    }
  };

  /*
  Retrieving User Preferences (getUserPreferences)
  fetches stored language preferences (default_from_lang, default_to_lang).
  retrieves directly from the Users table.
  ensures user exists before returning preferences.
  logs query execution and results.
  */
  getUserPreferences = async (userId) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request()
        .input('UserId', sql.UniqueIdentifier, userId);
  
      const result = await request.query(`
        SELECT default_from_lang, default_to_lang 
        FROM Users 
        WHERE id = @UserId
      `);
      console.log('getUserPreferences result:', result.recordset);
      if (result.recordset.length === 0) {
        throw new Error('User not found');
      }
      return result.recordset[0];
    } catch (error) {
      console.error('❌ Get User Preferences Error:', {
        message: error.message,
        stack: error.stack,
        originalError: error.originalError,
      });
      throw error;
    }
  };
}

// Export all functions
export {
  getPool,
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
};