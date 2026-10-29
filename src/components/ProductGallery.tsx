'use client';

import { useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, Image as ImageIcon, Maximize2, Minus, Move, Plus, RotateCcw } from 'lucide-react';
import type { ProductImageData } from '@/lib/data';
import { getPrintDimensions } from '@/lib/product-options';
import { getRoomPreviewImage } from '@/lib/product-media';
import {
  getConfigurationShortLabel,
  getFrameLabel,
  getPaperLabel,
  type FrameStyle,
  type PaperQuality,
  type ProductFormat,
} from '@/lib/product-configuration';
import ProductDialog from './ProductDialog';
import styles from './ProductGallery.module.css';

interface ProductGalleryProps {
  mainImage: string;
  images: ProductImageData[];
  productName: string;
  selectedSize?: string;
  selectedFormat?: ProductFormat;
  selectedPaper?: PaperQuality;
  selectedFrame?: FrameStyle;
  initialView?: 'art' | 'room';
}

const WALL_COLORS = [
  { name: 'Warm ivory', color: '#e9e4da' },
  { name: 'Soft sage', color: '#cbd0c5' },
  { name: 'Stone', color: '#c9c4bd' },
];

export default function ProductGallery({
  mainImage,
  images,
  productName,
  selectedSize = 'A3',
  selectedFormat = 'POSTER',
  selectedPaper = 'CLASSIC_MATTE',
  selectedFrame = 'NONE',
  initialView = 'art',
}: ProductGalleryProps) {
  const seenImages = new Set<string>();
  const galleryImages = [
    { url: mainImage, alt: productName },
    ...[...images].sort((a, b) => a.position - b.position).map((image) => ({ url: image.url, alt: image.alt || productName })),
  ].filter((image) => {
    if (!image.url || seenImages.has(image.url)) return false;
    seenImages.add(image.url);
    return true;
  });

  const [activeUrl, setActiveUrl] = useState(mainImage);
  const [view, setView] = useState<'art' | 'room'>(initialView);
  const [failedRoomImage, setFailedRoomImage] = useState<string | null>(null);
  const [wallColor, setWallColor] = useState(0);
  const [landscape, setLandscape] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const zoomViewport = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const activeIndex = Math.max(0, galleryImages.findIndex((image) => image.url === activeUrl));
  const activeImage = galleryImages[activeIndex];
  const previewImage = getRoomPreviewImage(images);
  const flatArtwork = previewImage?.url !== failedRoomImage ? previewImage : undefined;
  const showRoom = view === 'room' && Boolean(flatArtwork);
  const dimensions = getPrintDimensions(selectedSize);
  const printDimensions = dimensions || getPrintDimensions('A3')!;
  const roomDimensions = landscape ? { width: printDimensions.height, height: printDimensions.width } : printDimensions;
  const isFramed = selectedFrame !== 'NONE';
  const selectedConfiguration = { format: selectedFormat, paper: selectedPaper, frame: selectedFrame };

  function selectImage(index: number) {
    const next = galleryImages[(index + galleryImages.length) % galleryImages.length];
    if (!next) return;
    setActiveUrl(next.url);
    setZoom(1);
    zoomViewport.current?.scrollTo(0, 0);
  }

  function openZoom() {
    if (Date.now() < suppressClickUntil.current) return;
    if (showRoom && flatArtwork) setActiveUrl(flatArtwork.url);
    setZoom(1);
    setZoomOpen(true);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || showRoom) {
      touchOrigin.current = null;
      return;
    }
    touchOrigin.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchOrigin.current;
    touchOrigin.current = null;
    const end = event.changedTouches[0];
    if (!start || !end) return;
    const x = end.clientX - start.x;
    const y = end.clientY - start.y;
    if (Math.abs(x) > 12 || Math.abs(y) > 12) suppressClickUntil.current = Date.now() + 500;
    if (galleryImages.length > 1 && Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.3) {
      selectImage(activeIndex + (x < 0 ? 1 : -1));
    }
  }

  function changeZoom(nextZoom: number) {
    const next = Math.max(1, Math.min(3, nextZoom));
    const viewport = zoomViewport.current;
    const left = viewport ? (viewport.scrollLeft + viewport.clientWidth / 2) * (next / zoom) - viewport.clientWidth / 2 : 0;
    const top = viewport ? (viewport.scrollTop + viewport.clientHeight / 2) * (next / zoom) - viewport.clientHeight / 2 : 0;
    setZoom(next);
    requestAnimationFrame(() => zoomViewport.current?.scrollTo({ left, top, behavior: 'instant' }));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (zoom <= 1 || event.pointerType === 'touch' || event.button !== 0) return;
    dragOrigin.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = 'grabbing';
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragOrigin.current) return;
    event.currentTarget.scrollLeft = dragOrigin.current.left - (event.clientX - dragOrigin.current.x);
    event.currentTarget.scrollTop = dragOrigin.current.top - (event.clientY - dragOrigin.current.y);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    dragOrigin.current = null;
    event.currentTarget.style.cursor = '';
  }

  if (!activeImage) {
    return <div className={styles.unavailable}><ImageIcon aria-hidden="true" size={28} /><span>Artwork preview coming soon</span></div>;
  }

  const roomStyle = {
    '--wall-color': WALL_COLORS[wallColor].color,
    '--print-width': `${roomDimensions.width / 140 * 74}%`,
    '--print-ratio': `${roomDimensions.width} / ${roomDimensions.height}`,
    '--frame-width': isFramed ? 'clamp(7px, 1.25vw, 14px)' : '0px',
    '--frame-color': {
      BLACK: '#272625',
      WHITE: '#f4f1ea',
      NATURAL_OAK: '#b98859',
      WALNUT: '#5d3d2c',
      NONE: 'transparent',
    }[selectedFrame],
  } as CSSProperties;

  return (
    <section className={styles.gallery} aria-label={`${productName} gallery`}>
      {flatArtwork && <div className={styles.galleryHeader}>
        <div className={styles.viewSwitch} aria-label="Preview style">
          <button type="button" aria-pressed={!showRoom} onClick={() => setView('art')}>Images</button>
          <button type="button" aria-pressed={showRoom} onClick={() => setView('room')}>Room preview</button>
        </div>
      </div>}

      <div
        className={styles.stage}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchOrigin.current = null; suppressClickUntil.current = Date.now() + 500; }}
        onKeyDown={(event) => {
          if (showRoom || galleryImages.length < 2) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            selectImage(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
          }
        }}
      >
        {!showRoom ? (
          <>
            <button type="button" className={styles.artButton} onClick={openZoom} aria-label={`Enlarge ${activeImage.alt}`} aria-haspopup="dialog">
              <Image src={activeImage.url} alt={activeImage.alt} fill sizes="(max-width: 760px) 94vw, (max-width: 1200px) 48vw, 620px" className={styles.artImage} loading={activeIndex === 0 ? 'eager' : 'lazy'} draggable={false} onLoad={(event) => { if (activeImage.url === flatArtwork?.url) setLandscape(event.currentTarget.naturalWidth > event.currentTarget.naturalHeight); }} />
              <span className={styles.zoomHint}><Maximize2 size={14} aria-hidden="true" /><span className={styles.desktopZoomLabel}>Click to zoom</span><span className={styles.mobileZoomLabel}>Tap to zoom</span></span>
            </button>
            {galleryImages.length > 1 && (
              <>
                <span className={styles.counter} aria-live="polite">{String(activeIndex + 1).padStart(2, '0')} / {String(galleryImages.length).padStart(2, '0')}</span>
                <button type="button" className={`${styles.imageArrow} ${styles.previous}`} onClick={() => selectImage(activeIndex - 1)} aria-label="Previous artwork image"><ArrowLeft size={18} aria-hidden="true" /></button>
                <button type="button" className={`${styles.imageArrow} ${styles.next}`} onClick={() => selectImage(activeIndex + 1)} aria-label="Next artwork image"><ArrowRight size={18} aria-hidden="true" /></button>
              </>
            )}
          </>
        ) : (
          <div className={styles.roomScene} style={roomStyle}>
            <span className={styles.roomLabel}>{dimensions ? selectedSize : 'Size reference'} · {roomDimensions.width} × {roomDimensions.height} cm</span>
            <span className={styles.roomSelection}>{getConfigurationShortLabel(selectedConfiguration)}</span>
            <div className={styles.roomLight} aria-hidden="true" />
            <div className={styles.roomFloor} aria-hidden="true" />
            <button type="button" className={`${styles.roomPrint} ${isFramed ? styles.framedPrint : styles.unframedPrint}`} onClick={openZoom} aria-label={`Enlarge ${productName}`} aria-haspopup="dialog">
              <span className={styles.roomArtWindow}>
                <Image src={flatArtwork!.url} alt={`${productName}, ${isFramed ? `${getFrameLabel(selectedFrame)} framed` : 'unframed'} above a console`} fill sizes="(max-width: 760px) 50vw, 360px" className={styles.roomArt} draggable={false} onLoad={(event) => setLandscape(event.currentTarget.naturalWidth > event.currentTarget.naturalHeight)} onError={() => setFailedRoomImage(flatArtwork!.url)} />
              </span>
            </button>
            <div className={styles.console} aria-hidden="true"><i /><i /></div>
            <div className={styles.books} aria-hidden="true"><i /><i /><i /></div>
            <div className={styles.vase} aria-hidden="true"><i /><i /><i /></div>
            <span className={styles.consoleReference}>140 cm console</span>
          </div>
        )}
      </div>

      {failedRoomImage && previewImage?.url === failedRoomImage && <p className={styles.previewError} role="status">The room preview image could not load. You can still browse the product images.</p>}

      {!showRoom && galleryImages.length > 1 && (
        <div className={styles.thumbnails} aria-label="Artwork images">
          {galleryImages.map((image, index) => (
            <button key={image.url} type="button" className={styles.thumbnail} aria-label={`View artwork image ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => selectImage(index)}>
              <Image src={image.url} alt="" fill sizes="72px" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {showRoom && (
        <div className={styles.roomFooter}>
          <div className={styles.wallColors} aria-label="Wall color">
            <span>Wall tone</span>
            {WALL_COLORS.map((wall, index) => (
              <button key={wall.name} type="button" aria-label={wall.name} aria-pressed={wallColor === index} title={wall.name} style={{ backgroundColor: wall.color }} onClick={() => setWallColor(index)}>{wallColor === index && <Check size={12} aria-hidden="true" />}</button>
            ))}
          </div>
          <p>Illustrative room preview. {isFramed ? `${getFrameLabel(selectedFrame)} frame selected.` : `${getPaperLabel(selectedPaper)} selected, unframed.`}</p>
        </div>
      )}

      <ProductDialog open={zoomOpen} onClose={() => setZoomOpen(false)} title={productName} className={styles.lightbox}>
        <div className={styles.zoomToolbar}>
          <p><Move size={14} aria-hidden="true" />{zoom > 1 ? 'Drag or scroll to explore' : 'Zoom in to see the details'}</p>
          <div className={styles.zoomControls} aria-label="Image zoom controls">
            <button type="button" disabled={zoom <= 1} onClick={() => changeZoom(zoom - 0.5)} aria-label="Zoom out"><Minus size={17} aria-hidden="true" /></button>
            <output aria-live="polite">{Math.round(zoom * 100)}%</output>
            <button type="button" disabled={zoom >= 3} onClick={() => changeZoom(zoom + 0.5)} aria-label="Zoom in"><Plus size={17} aria-hidden="true" /></button>
            <button type="button" disabled={zoom === 1} onClick={() => changeZoom(1)} aria-label="Reset zoom"><RotateCcw size={15} aria-hidden="true" /></button>
          </div>
        </div>
        <div ref={zoomViewport} className={styles.zoomViewport} data-zoomed={zoom > 1} tabIndex={0} role="region" aria-label="Artwork detail. Use the zoom controls, then scroll or drag to explore."
          onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { dragOrigin.current = null; }}
          onKeyDown={(event) => {
            if (zoom !== 1 || galleryImages.length < 2) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              selectImage(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
            }
          }}
        >
          <div className={styles.zoomCanvas} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            <Image src={activeImage.url} alt={activeImage.alt} fill sizes="90vw" className={styles.zoomImage} draggable={false} />
          </div>
        </div>
        {galleryImages.length > 1 && (
          <div className={styles.lightboxFooter}>
            <button type="button" onClick={() => selectImage(activeIndex - 1)} aria-label="Previous image in enlarged view"><ArrowLeft size={17} aria-hidden="true" /> Previous</button>
            <span aria-live="polite">{activeIndex + 1} of {galleryImages.length}</span>
            <button type="button" onClick={() => selectImage(activeIndex + 1)} aria-label="Next image in enlarged view">Next <ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        )}
      </ProductDialog>
    </section>
  );
}
