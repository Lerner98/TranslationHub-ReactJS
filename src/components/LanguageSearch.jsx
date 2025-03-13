import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { fetchLanguages } from '../services/translationService';
// State Management
const LanguageSearch = ({ value, onChange, placeholder = 'Search language...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || ''); // stores search input value, initially set from value prop
  const [languages, setLanguages] = useState([]); // list of languages
  const [filteredLanguages, setFilteredLanguages] = useState([]); // base on search
  const [loading, setLoading] = useState(false); // loading state while fetching langs
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null); // ref for dropdown click

/*
   fetch languages on mount, or when value changes.
   updates languages/filteredlanguages with fetched data.
   find and sets currently selected language in search.
*/
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
      .catch(err => { // handles errors and loading states
        console.error('Error fetching languages:', err);
        setError('Failed to fetch languages');
      })
      .finally(() => setLoading(false));
  }, [value]);

  /*
  Detecting clicks Outside the Dropdown by:
  listens for clicks outside the dropdown to close it.
  mousedown event ensures interaction outside closes the dropdown.
  cleanup function removes the event listener when the component unmounts.
*/
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /*
  Filtering Languages When User Types:
  filters languages based on search input.
  if search is empty, resets filteredLanguages to the full list.
  converts input and language names to lowercase for case-insensitive matching.
  */
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

  /*
  Handling Language Selection:
  updates selected language using OnChange(language.code)
  updates input field to show the selected language name
  closes the dropdown menu
  */
  const handleSelectLanguage = (language) => {
    onChange(language.code);
    setSearch(language.name);
    setIsOpen(false);
  };

  return ( // ref={dropdownRef} attaches the ref for outside click detection.
    <div className="relative" ref={dropdownRef}> 
      <div  // search input
        onClick={() => setIsOpen(true)} // ensures dropdown opens when clicks
        className="flex items-center gap-2 p-2 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:border-indigo-500 transition-colors bg-white dark:bg-gray-700"
      > 
        <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <input
          type="text"
          value={search} // updates search state when user types
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)} // true == displays dropdown
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100"
        />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
          <div className="py-1">
            {loading ? ( // display loading when fetching data
              <div className="p-2 text-center text-gray-500 dark:text-gray-400">
                Loading languages...
              </div>
            ) : error ? (
              <div className="p-2 text-center text-red-500">{error}</div>
            ) : filteredLanguages.length > 0 ? ( 
              filteredLanguages.map((language) => ( // maps filtered languages, renders each as a dropdown item
                <div
                  key={language.code}
                  onClick={() => handleSelectLanguage(language)} // clicing language from menu calls handleSelectLanguage
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