'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';

interface Variant {
  id: string;
  size: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
  productName: string;
  productImage: string;
  productStatus: string;
}

export default function StockEditor({ initialVariants }: { initialVariants: Variant[] }) {
  const [variants, setVariants] = useState(initialVariants);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const updateLocal = (id: string, field: keyof Variant, value: string | number | null) => {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleSave = async (variant: Variant) => {
    setSavingId(variant.id);
    try {
      const res = await fetch(`/api/admin/inventory/${variant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: variant.stock,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          sku: variant.sku,
        }),
      });
      if (res.ok) {
        setSavedId(variant.id);
        setTimeout(() => setSavedId(null), 2000);
      }
    } catch {
      alert('Failed to update.');
    } finally {
      setSavingId(null);
    }
  };

  const stockClass = (stock: number) => {
    if (stock === 0) return 'admin-stock-out';
    if (stock <= 5) return 'admin-stock-low';
    return 'admin-stock-ok';
  };

  return (
    <div className="admin-table-wrap">
      <div className="admin-table-header">
        <span className="admin-table-title">Stock Management</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {variants.filter((v) => v.stock === 0).length} out of stock · {variants.filter((v) => v.stock > 0 && v.stock <= 5).length} low stock
        </span>
      </div>
      {variants.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📦</div>
          <p>No variants found. Add size variants to your products first.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Size</th>
                <th>SKU</th>
                <th>Price (₹)</th>
                <th>Compare at (₹)</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} style={{ opacity: v.productStatus === 'DRAFT' ? 0.6 : 1 }}>
                  <td>
                    <span className="admin-table-product-name">{v.productName}</span>
                    {v.productStatus === 'DRAFT' && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>DRAFT</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{v.size}</td>
                  <td>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={v.sku || ''}
                      onChange={(e) => updateLocal(v.id, 'sku', e.target.value || null)}
                      placeholder="—"
                      style={{ width: '100px', padding: '5px 8px', fontSize: '0.85rem' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={v.price}
                      onChange={(e) => updateLocal(v.id, 'price', Number(e.target.value))}
                      style={{ width: '90px', padding: '5px 8px', fontSize: '0.85rem' }}
                      min={1}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={v.compareAtPrice ?? ''}
                      onChange={(e) => updateLocal(v.id, 'compareAtPrice', e.target.value ? Number(e.target.value) : null)}
                      placeholder="MRP"
                      style={{ width: '90px', padding: '5px 8px', fontSize: '0.85rem' }}
                      min={0}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={v.stock}
                      onChange={(e) => updateLocal(v.id, 'stock', Number(e.target.value))}
                      style={{ width: '70px', padding: '5px 8px', fontSize: '0.85rem' }}
                      min={0}
                    />
                  </td>
                  <td>
                    <span className={stockClass(v.stock)}>
                      {v.stock === 0 ? 'Out of Stock' : v.stock <= 5 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-btn admin-btn-primary admin-btn-sm"
                      onClick={() => handleSave(v)}
                      disabled={savingId === v.id}
                      style={{ opacity: savingId === v.id ? 0.5 : 1 }}
                    >
                      <Save size={12} /> {savingId === v.id ? '...' : savedId === v.id ? '✓' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
