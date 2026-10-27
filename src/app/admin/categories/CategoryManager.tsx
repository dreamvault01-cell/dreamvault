'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Save, Trash2, Plus, Edit3, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count: { products: number };
}

export default function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', image: '' });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', image: '' });
    setEditingId(null);
    setShowNew(false);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setShowNew(false);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
    });
  };

  const startNew = () => {
    setShowNew(true);
    setEditingId(null);
    setForm({ name: '', slug: '', description: '', image: '' });
  };

  const handleSave = async () => {
    if (!form.name) return alert('Name is required.');
    setSaving(true);

    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { ...form, slug };

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setCategories((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c)));
          resetForm();
          router.refresh();
        }
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          resetForm();
          router.refresh();
          const data = await res.json();
          setCategories((prev) => [...prev, { ...data, _count: { products: 0 } }]);
        }
      }
    } catch {
      alert('Error saving category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Products in this category will not be deleted.`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete.');
      }
    } catch {
      alert('Error deleting category.');
    }
  };

  const renderForm = () => (
    <div className="admin-table-wrap" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 700 }}>{editingId ? 'Edit Category' : 'New Category'}</span>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={resetForm}>
          <X size={14} /> Cancel
        </button>
      </div>
      <div className="admin-form-grid">
        <div className="admin-form-group">
          <label className="admin-form-label">Name *</label>
          <input
            className="admin-form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Abstract Art"
          />
        </div>
        <div className="admin-form-group">
          <label className="admin-form-label">Slug</label>
          <input
            className="admin-form-input"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="auto-generated"
          />
        </div>
        <div className="admin-form-group admin-form-full">
          <label className="admin-form-label">Description</label>
          <input
            className="admin-form-input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description..."
          />
        </div>
        <div className="admin-form-group admin-form-full">
          <label className="admin-form-label">Cover Image URL</label>
          <input
            className="admin-form-input"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="admin-form-actions">
        <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Category'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {(showNew || editingId) && renderForm()}

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">All Categories</span>
          {!showNew && !editingId && (
            <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={startNew}>
              <Plus size={14} /> Add Category
            </button>
          )}
        </div>
        {categories.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📁</div>
            <p>No categories. Create one above.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <div className="admin-table-product">
                      {cat.image && (
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          width={42}
                          height={42}
                          className="admin-table-thumb"
                          style={{ borderRadius: '8px', height: '42px' }}
                        />
                      )}
                      <div>
                        <div className="admin-table-product-name">{cat.name}</div>
                        {cat.description && <div className="admin-table-product-sub">{cat.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{cat.slug}</td>
                  <td>{cat._count.products}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => startEdit(cat)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDelete(cat.id, cat.name)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
