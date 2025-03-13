/*
FileTranslationScreen is a react component that provides a file translation interface for users
allowing them to upload a file .pdf, .doc, .docx, selecting a target language for translation,
translating the files content using google api and downloading the translated file as .docx or .txt
guest users are limited to 10 translations
*/

// Imports & Dependencies
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone'; // handles drag & drop file uploads
import { FileText, Upload, Download } from 'lucide-react';
import LanguageSearch from '../components/LanguageSearch';
import { useAuth } from '../context/AuthContext'; // for user status
import { getDocument } from 'pdfjs-dist'; // Browser-compatible PDF parsing, extracts text from pdfs
import { Document, Packer, Paragraph, TextRun } from 'docx'; // .docx generation for downloads
import mammoth from 'mammoth'; // For DOC/DOCX files text extraction

// State Management
const FileTranslationScreen = () => {
  const { user } = useAuth(); // track if a user is logged in or if its a guest user for limits
  const [file, setFile] = useState(null); // to store uploaded file
  const [translatedText, setTranslatedText] = useState(null); // holds translated content after processing
  const [toLang, setToLang] = useState('');
  const [loading, setLoading] = useState(false); // tracks translation process
  const [error, setError] = useState(null); 

  /*
  Enforcing Guest Translation Limits:
  loads and checks translated file count from localStorage for guests only
  */
  useEffect(() => {
    if (!user) {
      const translatedFiles = JSON.parse(localStorage.getItem('translatedFiles') || '[]');
      if (translatedFiles.length > 10) {
        setError('Guest limit reached: Maximum 10 file translations.');
      }
    }
    // Registered users have unlimited translations, no limit check needed
  }, [user]);

  /*
  Handling File Uploads:
  allows only one file at a time to make sure of type consistency
  resets previous translations & errors when a new file is uploaded
  */ 
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setTranslatedText(null);
      setError(null);
    }
  }, []);

  // Supports PDF/DOC/DOCX 
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  // Extracting Text from Files using `pdfjs-dist` or `mammoth`.  currently Limits to first PDF page, for multi page support need to change code
  const extractTextFromFile = async (file) => {
    let fileType;
    const extension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type;
    // Processing PDFs
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      fileType = 'pdf';
    } else if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === 'doc' ||
      extension === 'docx'
    ) {
      fileType = extension === 'doc' ? 'doc' : 'docx';
    } else {
      throw new Error('Unsupported file format');
    }

    let text = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (fileType === 'pdf') {
        const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const page = await pdf.getPage(1); // get the first page for testing simplicity
        const textContent = await page.getTextContent();
        text = textContent.items.map(item => item.str).join(' ');
      } else if (fileType === 'docx' || fileType === 'doc') { // uses mammoth to extract text from word docs
        const docxData = await mammoth.extractRawText({ arrayBuffer });
        text = docxData.value;
      } else {
        throw new Error('Unsupported file format');
      }
      return text.trim();
    } catch (err) {
      throw new Error(`Failed to extract text: ${err.message}`);
    }
  };

  /*
  Handling Translation:
  ensures a file and target language are selected
  checks guest user, enforcing 10-file translation limits
  */
  const handleTranslate = async () => {
    if (!file || !toLang) {
      setError('Please select a file and target language.');
      return;
    }

    // Check limit only for guests
    if (!user) {
      const translatedFiles = JSON.parse(localStorage.getItem('translatedFiles') || '[]');
      if (translatedFiles.length >= 10) {
        setError('Guest limit reached: Maximum 10 file translations.');
        return; 
      }
    }

    setLoading(true);
    setError(null);
    try { // Sending the text to google translate api
      const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
      const originalText = await extractTextFromFile(file);

      // Log the input for debugging
      console.log('Original Text:', originalText);
      console.log('Target Language:', toLang);

      // Use query parameters for the v2 API, omitting source to enable auto-detection
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}&q=${encodeURIComponent(originalText)}&target=${toLang}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      // Handling API errors, common errors like 409 conflict, 429 rate limit, logs response for debugging
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response Error:', response.status, errorText);
        if (response.status === 409) {
          throw new Error('Translation failed: API returned a 409 Conflict. Check API key, quota, or project configuration.');
        } else if (response.status === 429) {
          throw new Error('Translation failed: Rate limit exceeded. Please try again later or check your API quota.');
        }
        throw new Error(`Translation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.data || !result.data.translations || !result.data.translations[0]) {
        throw new Error('Translation failed: Invalid response from API');
      }
      const translatedContent = result.data.translations[0].translatedText;
      setTranslatedText(translatedContent);

      // Save translation count for guest users
      if (!user) {
        const translatedFiles = JSON.parse(localStorage.getItem('translatedFiles') || '[]');
        translatedFiles.push({ id: Date.now().toString(), fileName: file.name, timestamp: new Date() });
        localStorage.setItem('translatedFiles', JSON.stringify(translatedFiles));
      }
    } catch (error) {
      console.error('Translation error:', error);
      setError(`Failed to translate file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Downloading Translated Files, .docx with proper formatting, .txt for pdfs and unsupported formats
  const handleDownload = () => {
    if (!translatedText) return;

    const extension = file.name.split('.').pop().toLowerCase();
    if (extension === 'docx' || extension === 'doc') {
      // Generate a .docx file with basic formatting
      const paragraphs = translatedText.split('\n').map(line => new Paragraph({
        children: [new TextRun(line || ' ')], // Ensure empty lines are handled
      }));
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `translated_${file.name.split('.').slice(0, -1).join('.')}.docx`;
        link.click();
        URL.revokeObjectURL(url);
      }).catch(error => {
        console.error('Error generating .docx:', error);
        setError(`Failed to generate .docx file: ${error.message}`);
      });
    } else {
      // Default to .txt for PDF and other unsupported formats
      const blob = new Blob([translatedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `translated_${file.name.split('.').slice(0, -1).join('.')}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="w-48 mx-auto">
              <LanguageSearch
                value={toLang}
                onChange={setToLang}
                placeholder="Select target language"
              />
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-300 ${
              isDragActive
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900'
                : 'border-gray-300 hover:border-indigo-500'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {isDragActive
                ? 'Drop the file here'
                : 'Drag & drop a file here, or click to select'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supported formats: PDF, DOC, DOCX
            </p>
          </div>

          {file && (
            <div className="mt-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
                </div>
                <button
                  onClick={handleTranslate}
                  disabled={loading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{loading ? 'Translating...' : 'Translate'}</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}

          {translatedText && (
            <div className="mt-6">
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mx-auto"
              >
                <Download className="w-4 h-4" />
                <span>Download Translated File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileTranslationScreen;