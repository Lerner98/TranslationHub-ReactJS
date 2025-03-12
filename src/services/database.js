import sql from 'mssql';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    return { success: true, user: { id: user.id, email: user.email, session_id: crypto.randomUUID() } };
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

  logoutUser = async () => ({ success: true, message: 'Logged out successfully' });

  validateSession = async () => true;

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

      const sessionId = crypto.randomUUID();
      await poolInstance.request()
        .input('UserId', sql.UniqueIdentifier, user.UserId)
        .input('SessionId', sql.UniqueIdentifier, sessionId)
        .execute('spCreateSession');

      return { 
        success: true, 
        user: { 
          id: user.UserId, 
          email: user.email, 
          session_id: sessionId,
          default_from_lang: user.default_from_lang,
          default_to_lang: user.default_to_lang 
        } 
      };
    } catch (error) {
      console.error('❌ Login Error:', error);
      return { success: false, error: error.message };
    }
  };

  logoutUser = async (sessionId) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      await poolInstance.request().input('SessionId', sql.UniqueIdentifier, sessionId).execute('spLogoutUser');
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('❌ Logout Error:', error);
      return { success: false, error: error.message };
    }
  };

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

  validateSession = async (sessionId) => {
    try {
      const poolInstance = await getPool();
      if (!poolInstance) throw new Error('Database connection failed');
      
      const request = poolInstance.request().input('SessionId', sql.UniqueIdentifier, sessionId);
      console.log(`Validating session with SessionId: ${sessionId}`); // Debug log
      const result = await request.execute('spValidateSession');
      console.log('Validate session result:', result.recordset); // Debug log
      return result.recordset.length > 0;
    } catch (error) {
      console.error('❌ Validate Session Error:', {
        message: error.message,
        stack: error.stack,
        originalError: error.originalError,
      });
      return false;
    }
  };

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