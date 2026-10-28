'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Upload, Plus, X, Save, GripVertical, ChevronDown, ChevronUp, Check, Eye,
  ImageIcon, Tag as TagIcon, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import ProductDialog from '@/components/ProductDialog';
import ProductGallery from '@/components/ProductGallery';
import mediaStyles from './ProductMedia.module.css';

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
  isRoomPreview: boolean;
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

const DEFAULT_VARIANTS: Variant[] = [
  { size: 'A4', price: 149, compareAtPrice: null, sku: '', stock: 50 },
  { size: 'A3', price: 199, compareAtPrice: null, sku: '', stock: 30 },
  { size: 'A2', price: 349, compareAtPrice: null, sku: '', stock: 20 },
];

type SectionKey = 'media' | 'details' | 'pricing' | 'variants' | 'tags' | 'organization';
type SectionsOpenState = Record<SectionKey, boolean>;

interface FormSnapshot {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice: number | '';
  badge: string;
  status: string;
  categoryId: string;
  variants: Variant[];
  images: ProductImageItem[];
  tags: TagItem[];
}

function getBasePrice(variants: Variant[], fallbackPrice: number) {
  return variants.length > 0
    ? Math.min(...variants.map((variant) => variant.price))
    : fallbackPrice;
}

function getFormSnapshot(values: FormSnapshot) {
  return JSON.stringify(values);
}

function getSlugFromName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function SectionHeader({
  title,
  icon,
  sectionKey,
  subtitle,
  isOpen,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  sectionKey: SectionKey;
  subtitle?: string;
  isOpen: boolean;
  onToggle: (sectionKey: SectionKey) => void;
}) {
  return (
    <button
      type="button"
      className="pf-section-header"
      onClick={() => onToggle(sectionKey)}
    >
      <div className="pf-section-header-left">
        <span className="pf-section-icon">{icon}</span>
        <div>
          <span className="pf-section-title">{title}</span>
          {subtitle && <span className="pf-section-subtitle">{subtitle}</span>}
        </div>
      </div>
      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );
}

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  return errors[field] ? (
    <span className="pf-field-error">
      <AlertCircle size={12} /> {errors[field]}
    </span>
  ) : null;
}

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
  const [compareAtPrice, setCompareAtPrice] = useState<number | ''>(initialData?.compareAtPrice || '');
  const [badge, setBadge] = useState(initialData?.badge || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [variants, setVariants] = useState<Variant[]>(() => initialData?.variants || DEFAULT_VARIANTS);
  const basePrice = getBasePrice(variants, initialData?.price ?? 0);

  // ---- Image Gallery State ----
  const [images, setImages] = useState<ProductImageItem[]>(
    initialData?.images?.length
      ? initialData.images.map((image) => ({ ...image, isRoomPreview: image.isRoomPreview === true }))
      : initialData?.image
        ? [{ url: initialData.image, alt: initialData.name, position: 0, isRoomPreview: false }]
        : []
  );
  const [uploading, setUploading] = useState(false);
  const [roomPreviewOpen, setRoomPreviewOpen] = useState(false);
  const [previewSize, setPreviewSize] = useState('A3');
  const roomPreviewImage = images.find((image) => image.isRoomPreview);
  const previewSizes = [...new Set(variants.map((variant) => variant.size))];
  const selectedPreviewSize = previewSizes.includes(previewSize) ? previewSize : (previewSizes[0] || 'A3');

  // ---- Tags State ----
  const [tags, setTags] = useState<TagItem[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // ---- UI State ----
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sectionsOpen, setSectionsOpen] = useState<SectionsOpenState>({
    media: true,
    details: true,
    pricing: true,
    variants: true,
    tags: true,
    organization: true,
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const currentFormSnapshot = getFormSnapshot({
    name,
    slug,
    description,
    shortDescription,
    price: basePrice,
    compareAtPrice,
    badge,
    status,
    categoryId,
    variants,
    images,
    tags,
  });
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(() => currentFormSnapshot);
  const hasUnsavedChanges = currentFormSnapshot !== savedFormSnapshot;

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

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) {
      setSlug(getSlugFromName(value));
    }
    setErrors((previous) => ({ ...previous, name: '' }));
  };

  // ---- Validation ----
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!slug.trim()) errs.slug = 'URL slug is required';
    if (!description.trim()) errs.description = 'Description is required';
    if (images.length === 0) errs.images = 'At least one image is required';
    if (!categoryId) errs.categoryId = 'Category is required';
    if (variants.length === 0) errs.variants = 'At least one size variant is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

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
        if (!res.ok || typeof data.url !== 'string' || !data.url) {
          throw new Error(typeof data.error === 'string' ? data.error : `Failed to upload ${file.name}`);
        }
        newImages.push({
          url: data.url,
          alt: name || file.name.replace(/\.[^/.]+$/, ''),
          position: images.length + newImages.length,
          isRoomPreview: false,
        });
      } catch (error) {
        showError('Upload Failed', error instanceof Error ? error.message : `Failed to upload ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages].map((image, position) => ({ ...image, position })));
      success('Images Uploaded', `${newImages.length} image(s) added`);
    }
    setUploading(false);
    // Clear file input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, position: i })));
  };

  const toggleRoomPreview = (index: number) => {
    setImages((previous) => previous.map((image, imageIndex) => ({
      ...image,
      isRoomPreview: imageIndex === index ? !image.isRoomPreview : false,
    })));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((previous) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= previous.length) return previous;
      const reordered = [...previous];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered.map((image, position) => ({ ...image, position }));
    });
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
      setVariants([...variants, { size: nextSize, price: basePrice || 149, compareAtPrice: null, sku: '', stock: 10 }]);
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // ---- Toggle Sections ----
  const toggleSection = (key: SectionKey) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading || saving) return;
    if (!validate()) {
      showError('Validation Error', 'Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
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
          price: basePrice,
          compareAtPrice: compareAtPrice || null,
          images: images.map((img, i) => ({ url: img.url, alt: img.alt || name, position: i, isRoomPreview: img.isRoomPreview })),
          badge: badge || null,
          status,
          categoryId,
          variants,
          tags: tags.map((t) => ({ name: t.name, slug: t.slug })),
        }),
      });

      if (res.ok) {
        setSavedFormSnapshot(currentFormSnapshot);
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

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="pf-form">
      <div className="pf-layout">
        {/* ========== LEFT COLUMN ========== */}
        <div className="pf-left">
          {/* MEDIA Section */}
          <div className="pf-card">
            <SectionHeader title="Media" icon={<ImageIcon size={18} />} sectionKey="media" subtitle={`${images.length} image(s)`} isOpen={sectionsOpen.media} onToggle={toggleSection} />
            {sectionsOpen.media && (
              <div className="pf-card-body">
                <div className={mediaStyles.help}>
                  <div>
                    <h3>Product images</h3>
                    <p>The first image is the cover. Drag images or use the arrows to change their order.</p>
                    <p>For an optional room preview, choose one artwork-only image: just the printed design, without a frame, wall or furniture.</p>
                  </div>
                  {roomPreviewImage && (
                    <button type="button" className={mediaStyles.previewButton} onClick={() => setRoomPreviewOpen(true)} aria-haspopup="dialog">
                      <Eye size={16} aria-hidden="true" /> Preview room
                    </button>
                  )}
                </div>

                {/* Image Gallery */}
                {images.length > 0 && (
                  <div className={mediaStyles.grid}>
                    {images.map((img, index) => (
                      <article
                        key={img.id || img.url}
                        className={`${mediaStyles.card} ${dragIndex === index ? mediaStyles.dragging : ''}`}
                        onDragOver={(e) => handleDragOver(e, index)}
                      >
                        <div
                          className={mediaStyles.image}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragEnd={handleDragEnd}
                        >
                          <span className={mediaStyles.grip} aria-hidden="true"><GripVertical size={16} /></span>
                          <Image src={img.url} alt={img.alt || name || `Product image ${index + 1}`} fill sizes="(max-width: 600px) 90vw, (max-width: 1100px) 30vw, 240px" draggable={false} />
                          {index === 0 && <span className={mediaStyles.coverBadge}>Cover image</span>}
                          <button type="button" className={mediaStyles.remove} onClick={() => removeImage(index)} aria-label={`Remove image ${index + 1}`}>
                            <X size={16} aria-hidden="true" />
                          </button>
                        </div>
                        <div className={mediaStyles.controls}>
                          <div className={mediaStyles.order}>
                            <span>Image {index + 1}</span>
                            <div>
                              <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label={`Move image ${index + 1} earlier`}><ChevronUp size={16} aria-hidden="true" /></button>
                              <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label={`Move image ${index + 1} later`}><ChevronDown size={16} aria-hidden="true" /></button>
                            </div>
                          </div>
                          <label className={mediaStyles.altLabel}>
                            Image description
                            <input
                              type="text"
                              className="pf-input pf-input-sm"
                              value={img.alt}
                              maxLength={500}
                              placeholder="Describe the artwork or photo"
                              onChange={(event) => setImages((previous) => previous.map((image, imageIndex) => imageIndex === index ? { ...image, alt: event.target.value } : image))}
                            />
                          </label>
                          <button type="button" className={mediaStyles.previewToggle} aria-pressed={img.isRoomPreview} aria-label={`Use image ${index + 1} for room preview`} onClick={() => toggleRoomPreview(index)}>
                            <span className={mediaStyles.toggleIndicator} aria-hidden="true">{img.isRoomPreview && <Check size={13} />}</span>
                            {img.isRoomPreview ? 'Room preview image' : 'Use for room preview'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {images.length > 0 && (
                  <p className={mediaStyles.selectionStatus} role="status">
                    {roomPreviewImage ? 'Room preview enabled. Save the product to update the storefront.' : 'No room preview selected. Customers will still see all product images.'}
                  </p>
                )}

                {/* Upload Area */}
                <label className="pf-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={uploading || saving}
                  />
                  <Upload size={24} style={{ opacity: 0.5 }} />
                  <span className="pf-upload-text">
                    {uploading ? 'Uploading...' : 'Choose images to upload'}
                  </span>
                  <span className="pf-upload-hint">PNG, JPG, WebP · Multiple files supported</span>
                </label>
                <FieldError field="images" errors={errors} />
              </div>
            )}
          </div>

          {/* DETAILS Section */}
          <div className="pf-card">
            <SectionHeader title="Product Details" icon={<Save size={18} />} sectionKey="details" isOpen={sectionsOpen.details} onToggle={toggleSection} />
            {sectionsOpen.details && (
              <div className="pf-card-body">
                <div className="pf-field">
                  <label className="pf-label">Product Name <span className="pf-required">*</span></label>
                  <input
                    type="text"
                    className={`pf-input ${errors.name ? 'pf-input-error' : ''}`}
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Cosmic Serenity — Nebula Art Print"
                  />
                  <FieldError field="name" errors={errors} />
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
                  <FieldError field="slug" errors={errors} />
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
                  <FieldError field="description" errors={errors} />
                </div>
              </div>
            )}
          </div>

          {/* SIZE VARIANTS Section */}
          <div className="pf-card">
            <SectionHeader title="Size Variants & Pricing" icon={<span style={{ fontSize: '1rem' }}>📐</span>} sectionKey="variants" subtitle={`${variants.length} variant(s)`} isOpen={sectionsOpen.variants} onToggle={toggleSection} />
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
                <FieldError field="variants" errors={errors} />
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
            <SectionHeader title="Organization" icon={<span style={{ fontSize: '1rem' }}>📂</span>} sectionKey="organization" isOpen={sectionsOpen.organization} onToggle={toggleSection} />
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
                  <FieldError field="categoryId" errors={errors} />
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
            <SectionHeader title="Pricing" icon={<span style={{ fontSize: '1rem' }}>💰</span>} sectionKey="pricing" isOpen={sectionsOpen.pricing} onToggle={toggleSection} />
            {sectionsOpen.pricing && (
              <div className="pf-card-body">
                <div className="pf-pricing-summary">
                  <div className="pf-pricing-row">
                    <span className="pf-pricing-label">Base Price (auto)</span>
                    <span className="pf-pricing-value">₹{basePrice}</span>
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
            <SectionHeader title="Tags" icon={<TagIcon size={18} />} sectionKey="tags" subtitle={`${tags.length} tag(s)`} isOpen={sectionsOpen.tags} onToggle={toggleSection} />
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
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || uploading}>
            <Save size={16} /> {saving ? 'Saving...' : uploading ? 'Uploading images...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>

      <ProductDialog open={roomPreviewOpen && Boolean(roomPreviewImage)} onClose={() => setRoomPreviewOpen(false)} title="Room preview" className={mediaStyles.previewDialog}>
        <div className={mediaStyles.previewIntro}>
          <p>Preview your selected artwork before saving. This illustration is not a product photo.</p>
          <label>
            Print size
            <select value={selectedPreviewSize} onChange={(event) => setPreviewSize(event.target.value)} aria-label="Room preview print size">
              {(previewSizes.length ? previewSizes : ['A3']).map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
        <div className={mediaStyles.previewGallery}>
          <ProductGallery
            key={roomPreviewImage?.url || 'none'}
            mainImage={images[0]?.url || ''}
            images={images.map((image, index) => ({ ...image, id: image.id || `preview-${index}` }))}
            productName={name || 'Your artwork'}
            selectedSize={selectedPreviewSize}
            initialView="room"
          />
        </div>
      </ProductDialog>
    </form>
  );
}
