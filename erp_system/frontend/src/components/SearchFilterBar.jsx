import React from 'react';
import Select from 'react-select';

const filterBarStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    alignItems: 'center',
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

const clearButtonStyle = {
    marginTop: '22px',
    padding: '10px 16px',
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#b91c1c',
    fontFamily: 'Arial, sans-serif',
};

function SearchFilterBar({
    searchField,
    setSearchField,
    searchTerm,
    setSearchTerm,
    fieldOptions,
    getSearchOptions,
    defaultField,
    onSearchTermChange,
}) {
    const showClear = searchTerm || searchField.value !== defaultField.value;

    return (
        <div style={filterBarStyle}>
            <div style={{ minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>
                    Filter Column By
                </label>
                <Select
                    value={searchField}
                    onChange={(selected) => {
                        setSearchField(selected);
                        setSearchTerm(null);
                        onSearchTermChange?.(null);
                    }}
                    options={fieldOptions}
                />
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>
                    Search or Select {searchField.label}...
                </label>
                <Select
                    value={searchTerm}
                    onChange={(selected) => {
                        setSearchTerm(selected);
                        onSearchTermChange?.(selected);
                    }}
                    options={getSearchOptions()}
                    placeholder={`Start typing ${searchField.label.toLowerCase()} to filter...`}
                    isClearable
                />
            </div>
            {showClear && (
                <button
                    type="button"
                    onClick={() => {
                        setSearchTerm(null);
                        setSearchField(defaultField);
                        onSearchTermChange?.(null);
                    }}
                    style={clearButtonStyle}
                >
                    Clear Filter
                </button>
            )}
        </div>
    );
}

export default SearchFilterBar;
