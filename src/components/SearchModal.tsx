'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { searchProductsAction } from '@/app/actions/products';
import { Search, TrendingUp, ArrowRight, Image as ImageIcon } from 'lucide-react';

interface ProductResult {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  image: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        const data = await searchProductsAction(query);
        setResults(data);
        setIsSearching(false);
      } else {
        setResults([]);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Reset state when closing — wrap the parent's onClose
  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle handled externally
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  return (
    <div
      className={`search-overlay ${isOpen ? 'open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="search-modal">
        <div className="search-input-wrap">
          <span className="search-icon"><Search size={22} /></span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posters, art prints, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="search-input"
          />
          <button onClick={handleClose} aria-label="Close search">
            <kbd className="search-esc-key">ESC</kbd>
          </button>
        </div>

        <div className="search-results">
          {query.length < 2 && (
            <div className="search-empty-state">
              <div className="search-empty-header">
                <TrendingUp size={16} />
                <span>Trending Searches</span>
              </div>
              <div className="search-quick-links">
                <Link href="/collections/anime" onClick={handleClose} className="search-quick-link">
                  <ImageIcon size={14} /> Anime Posters
                </Link>
                <Link href="/collections/abstract" onClick={handleClose} className="search-quick-link">
                  <ImageIcon size={14} /> Abstract Art
                </Link>
                <Link href="/collections/wall-setup-packs" onClick={handleClose} className="search-quick-link">
                  <ImageIcon size={14} /> Gallery Wall Sets
                </Link>
                <Link href="/collections/minimal" onClick={handleClose} className="search-quick-link">
                  <ImageIcon size={14} /> Minimalist Prints
                </Link>
              </div>
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !isSearching && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          
          {isSearching && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Searching...
            </div>
          )}

          {!isSearching && results.map((product, i) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="search-result-item"
              onClick={handleClose}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="search-result-image">
                <Image src={product.image} alt={product.name} width={60} height={60} />
              </div>
              <div className="search-result-info">
                <div className="search-result-name">{product.name}</div>
                <div className="search-result-category">{product.category}</div>
              </div>
              <div className="search-result-action">
                <div className="search-result-price">₹{product.price}</div>
                <ArrowRight size={16} className="search-result-arrow" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

