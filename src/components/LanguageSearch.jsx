import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { fetchLanguages } from '../services/translationService';

const LanguageSearch = ({ value, onChange, placeholder = 'Search language...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || ''); // Sync with value prop
  const [languages, setLanguages] = useState([]);
  const [filteredLanguages, setFilteredLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchLanguages()
      .then(data => {
        console.log('Fetched languages:', data);
        setLanguages(data);
        setFilteredLanguages(data);
        const selectedLang = data.find(lang => lang.code === value);
        if (selectedLang && search !== selectedLang.name) {
          setSearch(selectedLang.name);
        }
      })
      .catch(err => {
        console.error('Error fetching languages:', err);
        setError('Failed to fetch languages');
      })
      .finally(() => setLoading(false));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    console.log('Search term:', search);
    if (!search.trim()) {
      setFilteredLanguages(languages);
      return;
    }
    const filtered = languages.filter(lang =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase())
    );
    console.log('Filtered languages:', filtered);
    setFilteredLanguages(filtered);
  }, [search, languages]);

  const handleSelectLanguage = (language) => {
    onChange(language.code);
    setSearch(language.name);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 p-2 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:border-indigo-500 transition-colors bg-white dark:bg-gray-700"
      >
        <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100"
        />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
          <div className="py-1">
            {loading ? (
              <div className="p-2 text-center text-gray-500 dark:text-gray-400">
                Loading languages...
              </div>
            ) : error ? (
              <div className="p-2 text-center text-red-500">{error}</div>
            ) : filteredLanguages.length > 0 ? (
              filteredLanguages.map((language) => (
                <div
                  key={language.code}
                  onClick={() => handleSelectLanguage(language)}
                  className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    language.code === value ? 'bg-indigo-50 dark:bg-gray-700' : ''
                  }`}
                >
                  {language.name} ({language.code})
                </div>
              ))
            ) : (
              <div className="p-2 text-center text-gray-500 dark:text-gray-400">
                {search.trim() ? 'No languages found' : 'Select a language'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSearch;