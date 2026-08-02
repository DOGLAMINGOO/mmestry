import React from 'react';

function PaginationControls({ count = 0, next = null, previous = null, page = 1, pageSize = 25, onPrevious, onNext }) {
  const totalPages = count > 0 ? Math.ceil(count / pageSize) : 1;
  const showingCount = count > 0 ? Math.min(pageSize, count - (page - 1) * pageSize) : 0;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', borderRadius: '0 0 10px 10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#475569', fontSize: '14px' }}>
        <span><strong>Page {page}</strong> of <strong>{totalPages}</strong></span>
        <span style={{ background: '#e0f2fe', color: '#0c4a6e', borderRadius: '9999px', padding: '4px 10px', fontWeight: 600 }}>Showing {showingCount} of {count} entries</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onPrevious}
          disabled={!previous}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: previous ? '#ffffff' : '#f1f5f9',
            color: previous ? '#111827' : '#94a3b8',
            cursor: previous ? 'pointer' : 'not-allowed',
            fontWeight: '600'
          }}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!next}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: next ? '#2563eb' : '#f1f5f9',
            color: next ? '#ffffff' : '#94a3b8',
            cursor: next ? 'pointer' : 'not-allowed',
            fontWeight: '600'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default PaginationControls;
