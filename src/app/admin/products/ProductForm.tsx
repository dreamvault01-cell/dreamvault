'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Upload, Plus, X, Save, GripVertical, ChevronDown, ChevronUp,
  ImageIcon, Tag as TagIcon, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  size: string;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  stock: number;
}

interface ProductImageItem {
  id?: string;
  url: string;
  alt: string;
  position: number;
}

interface TagItem {
  id?: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  categories: Category[];
  existingTags?: TagItem[];
  initialData?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    price: number;
    compareAtPrice: number | null;
    image: string;
    images: ProductImageItem[];
    badge: string | null;
    status: string;
    categoryId: string;
    variants: Variant[];
    tags: TagItem[];
  };
}

const SIZES = ['A4', 'A3', 'A2', 'A1'];

const SUGGESTED_TAGS = [
  'trending', 'bestseller', 'new-arrival', 'limited-edition',
  'anime', 'minimalist', 'abstract', 'nature', 'movie', 'retro',
  'dark', 'colorful', 'typography', 'illustration', 'photography',
];

export default function ProductForm({ categories, existingTags = [], initialData }: ProductFormProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const isEdit = !!initialData;
  const formRef = useRef<HTMLFormElement>(null);

  // ---- Form State ----
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '');
  const [price, setPrice] = useState(initialData?.price || 0);
  const [compareAtPrice, setCompareAtPrice] = useState<number | ''>(initialData?.compareAtPrice || '');
  const [badge, setBadge] = useState(initialData?.badge || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [variants, setVariants] = useState<Variant[]>(
    initialData?.variants || [
      { size: 'A4', price: 149, compareAtPrice: null, sku: '', stock: 50 },
      { size: 'A3', price: 199, compareAtPrice: null, sku: '', stock: 30 },
      { size: 'A2', price: 349, compareAtPrice: null, sku: '', stock: 20 },
    ]
  );

  // ---- Image Gallery State ----
  const [images, setImages] = useState<ProductImageItem[]>(
    initialData?.images?.length
      ? initialData.images
      : initialData?.image
        ? [{ url: initialData.image, alt: initialData.name, position: 0 }]
        : []
  );
  const [uploading, setUploading] = useState(false);

  // ---- Tags State ----
  const [tags, setTags] = useState<TagItem[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // ---- UI State ----
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sectionsOpen, setSectionsOpen] = useState({
    media: true,
    details: true,
    pricing: true,
    variants: true,
    tags: true,
    organization: true,
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [name, slug, description, shortDescription, price, compareAtPrice, badge, status, categoryId, variants, images, tags]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEdit) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [name, isEdit]);

  // Auto-update base price to lowest variant price
  useEffect(() => {
    if (variants.length > 0) {
      const minPrice = Math.min(...variants.map((v) => v.price));
      setPrice(minPrice);
    }
  }, [variants]);

  // ---- Validation ----
  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!slug.trim()) errs.slug = 'URL slug is required';
    if (!description.trim()) errs.description = 'Description is required';
    if (images.length === 0) errs.images = 'At least one image is required';
    if (!categoryId) errs.categoryId = 'Category is required';
    if (variants.length === 0) errs.variants = 'At least one size variant is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, slug, description, images, categoryId, variants]);

  // ---- Image Upload ----
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: ProductImageItem[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          newImages.push({
            url: data.url,
            alt: name || file.name.replace(/\.[^/.]+$/, ''),
            position: images.length + newImages.length,
          });
        }
      } catch {
        showError('Upload Failed', `Failed to upload ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
      success('Images Uploaded', `${newImages.length} image(s) added`);
    }
    setUploading(false);
    // Clear file input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, position: i })));
  };

  // ---- Image Drag & Drop Reorder ----
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    setImages((prev) => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, dragged);
      return updated.map((img, i) => ({ ...img, position: i }));
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // ---- Tags ----
  const addTag = (tagName: string) => {
    const trimmed = tagName.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed)) return;

    const tagSlug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingTag = existingTags.find((t) => t.name.toLowerCase() === trimmed || t.slug === tagSlug);

    setTags((prev) => [
      ...prev,
      existingTag || { name: trimmed, slug: tagSlug },
    ]);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value.trim()) {
      const lowerVal = value.toLowerCase();
      const allSuggestions = [
        ...new Set([
          ...SUGGESTED_TAGS,
          ...existingTags.map((t) => t.name),
        ]),
      ];
      const filtered = allSuggestions
        .filter((s) => s.toLowerCase().includes(lowerVal))
        .filter((s) => !tags.some((t) => t.name.toLowerCase() === s.toLowerCase()));
      setTagSuggestions(filtered.slice(0, 8));
      setShowTagSuggestions(filtered.length > 0);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  // ---- Variants ----
  const updateVariant = (index: number, field: keyof Variant, value: string | number | null) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const addVariant = () => {
    const usedSizes = variants.map((v) => v.size);
    const nextSize = SIZES.find((s) => !usedSizes.includes(s));
    if (nextSize) {
      setVariants([...variants, { size: nextSize, price: price || 149, compareAtPrice: null, sku: '', stock: 10 }]);
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // ---- Toggle Sections ----
  const toggleSection = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showError('Validation Error', 'Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const primaryImage = images[0]?.url || '';
      const url = isEdit ? `/api/admin/products/${initialData.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          shortDescription: shortDescription || null,
          price,
          compareAtPrice: compareAtPrice || null,
          image: primaryImage,
          images: images.map((img, i) => ({ url: img.url, alt: img.alt || name, position: i })),
          badge: badge || null,
          status,
          categoryId,
          variants,
          tags: tags.map((t) => ({ name: t.name, slug: t.slug })),
        }),
      });

      if (res.ok) {
        setHasUnsavedChanges(false);
        success(
          isEdit ? 'Product Updated' : 'Product Created',
          `"${name}" has been ${isEdit ? 'updated' : 'created'} successfully`
        );
        setTimeout(() => {
          router.push('/admin/products');
          router.refresh();
        }, 800);
      } else {
        const err = await res.json();
        showError('Save Failed', err.error || 'Failed to save product.');
      }
    } catch {
      showError('Error', 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Render Helpers ----
  const SectionHeader = ({
    title,
    icon,
    sectionKey,
    subtitle,
  }: {
    title: string;
    icon: React.ReactNode;
    sectionKey: keyof typeof sectionsOpen;
    subtitle?: string;
  }) => (
    <button
      type="button"
      className="pf-section-header"
      onClick={() => toggleSection(sectionKey)}
    >
      <div className="pf-section-header-left">
        <span className="pf-section-icon">{icon}</span>
        <div>
          <span className="pf-section-title">{title}</span>
          {subtitle && <span className="pf-section-subtitle">{subtitle}</span>}
        </div>
      </div>
      {sectionsOpen[sectionKey] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <span className="pf-field-error">
        <AlertCircle size={12} /> {errors[field]}
      </span>
    ) : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="pf-form">
      <div className="pf-layout">
        {/* ========== LEFT COLUMN ========== */}
        <div className="pf-left">
          {/* MEDIA Section */}
          <div className="pf-card">
            <SectionHeader title="Media" icon={<ImageIcon size={18} />} sectionKey="media" subtitle={`${images.length} image(s)`} />
            {sectionsOpen.media && (
              <div className="pf-card-body">
                {/* Image Gallery */}
                {images.length > 0 && (
                  <div className="pf-image-gallery">
                    {images.map((img, index) => (
                      <div
                        key={`${img.url}-${index}`}
                        className={`pf-image-item ${index === 0 ? 'pf-image-hero' : ''} ${dragIndex === index ? 'pf-image-dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="pf-image-grip">
                          <GripVertical size={14} />
                        </div>
                        <Image src={img.url} alt={img.alt || ''} width={index === 0 ? 300 : 100} height={index === 0 ? 375 : 125} style={{ objectFit: 'cover' }} />
                        {index === 0 && <span className="pf-image-hero-badge">HERO</span>}
                        <button type="button" className="pf-image-remove" onClick={() => removeImage(index)}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <label className="pf-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  <Upload size={24} style={{ opacity: 0.5 }} />
                  <span className="pf-upload-text">
                    {uploading ? 'Uploading...' : 'Click to upload or drag images'}
                  </span>
                  <span className="pf-upload-hint">PNG, JPG, WebP · Multiple files supported</span>
                </label>
                <FieldError field="images" />
              </div>
            )}
          </div>

          {/* DETAILS Section */}
          <div className="pf-card">
            <SectionHeader title="Product Details" icon={<Save size={18} />} sectionKey="details" />
            {sectionsOpen.details && (
              <div className="pf-card-body">
                <div className="pf-field">
                  <label className="pf-label">Product Name <span className="pf-required">*</span></label>
                  <input
                    type="text"
                    className={`pf-input ${errors.name ? 'pf-input-error' : ''}`}
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                    placeholder="e.g. Cosmic Serenity — Nebula Art Print"
                  />
                  <FieldError field="name" />
                </div>

                <div className="pf-field">
                  <label className="pf-label">URL Slug</label>
                  <div className="pf-slug-preview">
                    <span className="pf-slug-prefix">dreamvault.in/product/</span>
                    <input
                      type="text"
                      className="pf-input pf-slug-input"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="auto-generated"
                    />
                  </div>
                  <FieldError field="slug" />
                </div>

                <div className="pf-field">
                  <label className="pf-label">Short Description</label>
                  <input
                    type="text"
                    className="pf-input"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief tagline shown on product cards"
                    maxLength={160}
                  />
                  <span className="pf-char-count">{shortDescription.length}/160</span>
                </div>

                <div className="pf-field">
                  <label className="pf-label">Description <span className="pf-required">*</span></label>
                  <textarea
                    className={`pf-input pf-textarea ${errors.description ? 'pf-input-error' : ''}`}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: '' })); }}
                    placeholder="Full product description..."
                    rows={6}
                  />
                  <FieldError field="description" />
                </div>
              </div>
            )}
          </div>

          {/* SIZE VARIANTS Section */}
          <div className="pf-card">
            <SectionHeader title="Size Variants & Pricing" icon={<span style={{ fontSize: '1rem' }}>📐</span>} sectionKey="variants" subtitle={`${variants.length} variant(s)`} />
            {sectionsOpen.variants && (
              <div className="pf-card-body">
                {variants.map((variant, index) => (
                  <div key={variant.size} className="pf-variant-card">
                    <div className="pf-variant-header">
                      <span className="pf-variant-size-badge">{variant.size}</span>
                      <button type="button" className="pf-variant-remove" onClick={() => removeVariant(index)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="pf-variant-fields">
                      <div className="pf-field pf-field-compact">
                        <label className="pf-label-sm">Size</label>
                        <select className="pf-input pf-input-sm" value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value)}>
                          {SIZES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="pf-field pf-field-compact">
                        <label className="pf-label-sm">Price (₹)</label>
                        <input type="number" className="pf-input pf-input-sm" value={variant.price} onChange={(e) => updateVariant(index, 'price', Number(e.target.value))} min={1} />
                      </div>
                      <div className="pf-field pf-field-compact">
                        <label className="pf-label-sm">Compare at (₹)</label>
                        <input type="number" className="pf-input pf-input-sm" value={variant.compareAtPrice ?? ''} onChange={(e) => updateVariant(index, 'compareAtPrice', e.target.value ? Number(e.target.value) : null)} placeholder="MRP" min={0} />
                      </div>
                      <div className="pf-field pf-field-compact">
                        <label className="pf-label-sm">SKU</label>
                        <input type="text" className="pf-input pf-input-sm" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} placeholder="DV-001" />
                      </div>
                      <div className="pf-field pf-field-compact">
                        <label className="pf-label-sm">Stock</label>
                        <input type="number" className="pf-input pf-input-sm" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', Number(e.target.value))} min={0} />
                      </div>
                    </div>
                  </div>
                ))}

                {variants.length < SIZES.length && (
                  <button type="button" className="pf-add-variant-btn" onClick={addVariant}>
                    <Plus size={16} /> Add Size Variant
                  </button>
                )}
                <FieldError field="variants" />
              </div>
            )}
          </div>
        </div>

        {/* ========== RIGHT COLUMN ========== */}
        <div className="pf-right">
          {/* STATUS Card */}
          <div className="pf-card pf-status-card">
            <div className="pf-card-body">
              <div className="pf-field">
                <label className="pf-label">Product Status</label>
                <div className="pf-status-toggle">
                  <button
                    type="button"
                    className={`pf-status-btn ${status === 'ACTIVE' ? 'pf-status-active' : ''}`}
                    onClick={() => setStatus('ACTIVE')}
                  >
                    <span className="pf-status-dot pf-dot-active" /> Active
                  </button>
                  <button
                    type="button"
                    className={`pf-status-btn ${status === 'DRAFT' ? 'pf-status-draft' : ''}`}
                    onClick={() => setStatus('DRAFT')}
                  >
                    <span className="pf-status-dot pf-dot-draft" /> Draft
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ORGANIZATION Card */}
          <div className="pf-card">
            <SectionHeader title="Organization" icon={<span style={{ fontSize: '1rem' }}>📂</span>} sectionKey="organization" />
            {sectionsOpen.organization && (
              <div className="pf-card-body">
                <div className="pf-field">
                  <label className="pf-label">Category <span className="pf-required">*</span></label>
                  <select
                    className={`pf-input ${errors.categoryId ? 'pf-input-error' : ''}`}
                    value={categoryId}
                    onChange={(e) => { setCategoryId(e.target.value); setErrors((p) => ({ ...p, categoryId: '' })); }}
                  >
                    <option value="">Select a category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <FieldError field="categoryId" />
                </div>

                <div className="pf-field">
                  <label className="pf-label">Badge (optional)</label>
                  <input
                    type="text"
                    className="pf-input"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. Bestseller, New, Limited"
                  />
                </div>
              </div>
            )}
          </div>

          {/* PRICING Summary Card */}
          <div className="pf-card">
            <SectionHeader title="Pricing" icon={<span style={{ fontSize: '1rem' }}>💰</span>} sectionKey="pricing" />
            {sectionsOpen.pricing && (
              <div className="pf-card-body">
                <div className="pf-pricing-summary">
                  <div className="pf-pricing-row">
                    <span className="pf-pricing-label">Base Price (auto)</span>
                    <span className="pf-pricing-value">₹{price}</span>
                  </div>
                  <span className="pf-pricing-hint">Automatically set to lowest variant price</span>
                </div>
                <div className="pf-field" style={{ marginTop: '1rem' }}>
                  <label className="pf-label">Compare at Price (MRP)</label>
                  <input
                    type="number"
                    className="pf-input"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Shows strikethrough if higher"
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* TAGS Card */}
          <div className="pf-card">
            <SectionHeader title="Tags" icon={<TagIcon size={18} />} sectionKey="tags" subtitle={`${tags.length} tag(s)`} />
            {sectionsOpen.tags && (
              <div className="pf-card-body">
                <div className="pf-tags-input-wrap">
                  {tags.map((tag, index) => (
                    <span key={tag.slug} className="pf-tag-chip">
                      {tag.name}
                      <button type="button" onClick={() => removeTag(index)} className="pf-tag-remove">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    className="pf-tag-input"
                    value={tagInput}
                    onChange={(e) => handleTagInputChange(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onFocus={() => { if (tagInput) handleTagInputChange(tagInput); }}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                    placeholder={tags.length === 0 ? 'Add tags...' : ''}
                  />
                </div>

                {showTagSuggestions && (
                  <div className="pf-tag-suggestions">
                    {tagSuggestions.map((s) => (
                      <button key={s} type="button" className="pf-tag-suggestion" onClick={() => addTag(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {tags.length === 0 && (
                  <div className="pf-tag-presets">
                    <span className="pf-tag-presets-label">Popular:</span>
                    {SUGGESTED_TAGS.slice(0, 6).map((s) => (
                      <button key={s} type="button" className="pf-tag-preset-btn" onClick={() => addTag(s)}>
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="pf-action-bar">
        <div className="pf-action-bar-left">
          {hasUnsavedChanges && (
            <span className="pf-unsaved-badge">
              <span className="pf-unsaved-dot" /> Unsaved changes
            </span>
          )}
        </div>
        <div className="pf-action-bar-right">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard them?')) return;
              router.push('/admin/products');
            }}
          >
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </form>
  );
}
