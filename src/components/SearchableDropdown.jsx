import React, { useState, useEffect, useRef } from 'react';

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize options to handle both string[] and {value, label}[] formats
  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Filter options based on search term
  const filteredOptions = normalizedOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleSelect = option => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = e => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length
        ) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Find the display label for the current value
  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Main dropdown button/input */}
      <div
        className={`border-2 border-black rounded-lg ${compact ? 'px-2 py-1' : 'px-3 py-2'} w-full focus:border-blue-500 focus:outline-none transition-colors cursor-pointer flex items-center justify-between ${
          disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span
          className={`${!displayValue ? 'text-gray-400' : ''} ${compact ? 'text-sm' : ''}`}
        >
          {displayValue || placeholder}
        </span>
        <svg
          className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          className={`absolute z-50 w-full mt-1 bg-white border-2 border-black rounded-lg shadow-lg ${compact ? 'max-h-48' : 'max-h-60'} overflow-hidden`}
        >
          {/* Search input */}
          <div
            className={`${compact ? 'p-1' : 'p-2'} border-b border-gray-200`}
          >
            <input
              ref={inputRef}
              type="text"
              className={`w-full ${compact ? 'px-1 py-0.5 text-sm' : 'px-2 py-1'} border border-gray-300 rounded focus:outline-none focus:border-blue-500`}
              placeholder="Search..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {/* Options list */}
          <ul
            className={`${compact ? 'max-h-36' : 'max-h-48'} overflow-y-auto`}
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li
                className={`${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'} text-gray-500 text-center`}
              >
                No results found
              </li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={`${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'} cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-100'
                      : 'hover:bg-gray-100'
                  } ${option.value === value ? 'font-semibold bg-yellow-50' : ''}`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={option.value === value}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
