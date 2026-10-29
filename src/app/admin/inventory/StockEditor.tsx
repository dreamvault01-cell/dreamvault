'use client';

import { useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { getConfigurationLabel, type FrameStyle, type PaperQuality, type ProductFormat } from '@/lib/product-configuration';

interface Variant {
  id: string;
  size: string;
  format: ProductFormat;
  paper: PaperQuality;
  frame: FrameStyle;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
  reservedStock: number;
  productName: string;
  productImage: string;
  productStatus: string;
}

export default function StockEditor({ initialVariants }: { initialVariants: Variant[] }) {
  const [variants, setVariants] = useState(initialVariants);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const originalStocks = useRef(new Map(initialVariants.map((variant) => [variant.id, variant.stock])));
  const saveInFlight = useRef(false);
  const updateLocal = (id: string, field: keyof Variant, value: string | number | null) => setVariants((previous) => previous.map((variant) => variant.id === id ? { ...variant, [field]: value } : variant));

  const handleSave = async (variant: Variant) => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSavingId(variant.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/inventory/${variant.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: variant.stock, expectedStock: originalStocks.current.get(variant.id), price: variant.price, compareAtPrice: variant.compareAtPrice, sku: variant.sku }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        throw new Error(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Inventory could not be updated.');
      }
      const saved: Pick<Variant, 'id' | 'stock' | 'reservedStock' | 'price' | 'compareAtPrice' | 'sku'> = await response.json();
      originalStocks.current.set(variant.id, saved.stock);
      setVariants((previous) => previous.map((current) => current.id === variant.id ? {
        ...current,
        stock: saved.stock,
        reservedStock: saved.reservedStock,
        price: saved.price,
        compareAtPrice: saved.compareAtPrice,
        sku: saved.sku,
      } : current));
      setSavedId(variant.id);
      window.setTimeout(() => setSavedId(null), 2_000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Inventory could not be updated.');
    } finally {
      saveInFlight.current = false;
      setSavingId(null);
    }
  };

  const stockClass = (available: number) => available <= 0 ? 'admin-stock-out' : available <= 5 ? 'admin-stock-low' : 'admin-stock-ok';
  const unavailable = variants.filter((variant) => variant.stock - variant.reservedStock <= 0).length;
  const low = variants.filter((variant) => variant.stock - variant.reservedStock > 0 && variant.stock - variant.reservedStock <= 5).length;

  return <div className="admin-table-wrap">
    <div className="admin-table-header"><span className="admin-table-title">Stock management</span><span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{unavailable} unavailable · {low} low stock</span></div>
    {error && <p role="alert" style={{ margin: '0 1rem 1rem', color: '#b42318', fontSize: '0.84rem' }}>{error}</p>}
    {variants.length === 0 ? <div className="admin-empty"><p>No sellable configurations found.</p></div> : <div style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>Product</th><th>Size</th><th>Configuration</th><th>SKU</th><th>Price (₹)</th><th>Compare at (₹)</th><th>On hand</th><th>Held</th><th>Available</th><th>Status</th><th /></tr></thead><tbody>
      {variants.map((variant) => {
        const available = Math.max(0, variant.stock - variant.reservedStock);
        return <tr key={variant.id} style={{ opacity: variant.productStatus === 'DRAFT' ? .6 : 1 }}>
          <td><span className="admin-table-product-name">{variant.productName}</span>{variant.productStatus === 'DRAFT' && <small style={{ marginLeft: 6, color: 'var(--text-muted)' }}>DRAFT</small>}</td>
          <td style={{ fontWeight: 600 }}>{variant.size}</td><td style={{ fontSize: '.78rem', minWidth: 190 }}>{getConfigurationLabel(variant)}</td>
          <td><input type="text" className="admin-form-input" value={variant.sku || ''} onChange={(event) => updateLocal(variant.id, 'sku', event.target.value || null)} disabled={savingId !== null} placeholder="—" style={{ width: 100, padding: '5px 8px', fontSize: '.85rem' }} /></td>
          <td><input type="number" className="admin-form-input" value={variant.price} onChange={(event) => updateLocal(variant.id, 'price', Number(event.target.value))} disabled={savingId !== null} min={1} style={{ width: 90, padding: '5px 8px', fontSize: '.85rem' }} /></td>
          <td><input type="number" className="admin-form-input" value={variant.compareAtPrice ?? ''} onChange={(event) => updateLocal(variant.id, 'compareAtPrice', event.target.value ? Number(event.target.value) : null)} disabled={savingId !== null} placeholder="MRP" min={0} style={{ width: 90, padding: '5px 8px', fontSize: '.85rem' }} /></td>
          <td><input type="number" className="admin-form-input" value={variant.stock} onChange={(event) => updateLocal(variant.id, 'stock', Number(event.target.value))} disabled={savingId !== null} min={variant.reservedStock} style={{ width: 74, padding: '5px 8px', fontSize: '.85rem' }} /></td>
          <td style={{ color: variant.reservedStock ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{variant.reservedStock || '—'}</td><td style={{ fontWeight: 700 }}>{available}</td>
          <td><span className={stockClass(available)}>{available <= 0 ? 'Unavailable' : available <= 5 ? 'Low stock' : 'In stock'}</span></td>
          <td><button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => handleSave(variant)} disabled={savingId !== null} style={{ opacity: savingId !== null ? .5 : 1 }}><Save size={12} /> {savingId === variant.id ? '…' : savedId === variant.id ? 'Saved' : 'Save'}</button></td>
        </tr>;
      })}
    </tbody></table></div>}
  </div>;
}
