'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { searchProducts } from '@/data/products';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = query.length >= 2 ? searchProducts(query) : [];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle handled externally
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className={`search-overlay ${isOpen ? 'open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-modal">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posters, art prints, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="search-input"
          />
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            ESC
          </button>
        </div>

        <div className="search-results">
          {query.length < 2 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Start typing to search...
            </div>
          )}

          {query.length >= 2 && results.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="search-result-item"
              onClick={onClose}
            >
              <div className="search-result-image">
                <img src={product.image} alt={product.name} />
              </div>
              <div className="search-result-info">
                <div className="search-result-name">{product.name}</div>
                <div className="search-result-category">{product.category}</div>
              </div>
              <div className="search-result-price">₹{product.price}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

