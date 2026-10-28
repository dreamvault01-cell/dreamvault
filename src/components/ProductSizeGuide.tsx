'use client';

import { Check } from 'lucide-react';
import ProductDialog from './ProductDialog';
import { getPrintDimensions } from '@/lib/product-options';
import styles from './ProductSizeGuide.module.css';

interface ProductSizeGuideProps {
  open: boolean;
  onClose: () => void;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  availableSizes: string[];
}

const STANDARD_SIZES = ['A4', 'A3', 'A2', 'A1'];
const SCALE = 3.75;
const BASELINE = 337;
const CHART_POSITIONS = [38, 155, 304, 499];

function formatCentimetres(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function ProductSizeGuide({
  open,
  onClose,
  selectedSize,
  onSelectSize,
  availableSizes,
}: ProductSizeGuideProps) {
  const offeredSizes = new Map(availableSizes.map((size) => [size.trim().toUpperCase(), size]));
  const normalizedSelectedSize = selectedSize.trim().toUpperCase();

  function selectSize(size: string) {
    const offeredSize = offeredSizes.get(size);
    if (!offeredSize) return;
    onSelectSize(offeredSize);
    onClose();
  }

  return (
    <ProductDialog open={open} onClose={onClose} title="Size guide" className={styles.dialog}>
      <div className={styles.content}>
        <p className={styles.intro}>
          Compare print dimensions and choose a size.
        </p>

        <figure className={styles.comparison}>
          <svg
            className={styles.chart}
            viewBox="0 0 760 378"
            role="img"
            aria-label="Proportional comparison of A4, A3, A2 and A1 portrait prints. A4 is the size of a standard sheet of paper."
          >
            <line x1="24" y1={BASELINE + 1} x2="736" y2={BASELINE + 1} className={styles.baseline} />
            {STANDARD_SIZES.map((size, index) => {
              const dimensions = getPrintDimensions(size);
              if (!dimensions) return null;

              const width = dimensions.width * SCALE;
              const height = dimensions.height * SCALE;
              const x = CHART_POSITIONS[index];
              const y = BASELINE - height;
              const selected = normalizedSelectedSize === size;

              return (
                <g key={size} className={selected ? styles.selectedSilhouette : undefined}>
                  <rect x={x} y={y} width={width} height={height} className={styles.paper} />
                  <rect x={x + 7} y={y + 7} width={width - 14} height={height - 14} className={styles.paperInset} />
                  <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" className={styles.paperLabel}>
                    {size}
                  </text>
                  <text x={x + width / 2} y={BASELINE + 28} textAnchor="middle" className={styles.chartLabel}>
                    {size}
                  </text>
                </g>
              );
            })}
          </svg>
          <figcaption>Portrait prints, shown at the same scale.</figcaption>
        </figure>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Unframed print dimensions and size selection</caption>
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col" aria-label="Dimensions in centimetres">cm</th>
                <th scope="col">Inches</th>
                <th scope="col"><span className={styles.srOnly}>Choose a size</span></th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_SIZES.map((size) => {
                const dimensions = getPrintDimensions(size);
                if (!dimensions) return null;

                const centimetres = `${formatCentimetres(dimensions.width)} × ${formatCentimetres(dimensions.height)}`;
                const inches = `${(dimensions.width / 2.54).toFixed(1)} × ${(dimensions.height / 2.54).toFixed(1)}`;
                const offered = offeredSizes.has(size);
                const selected = normalizedSelectedSize === size;

                return (
                  <tr key={size} className={selected ? styles.selectedRow : undefined}>
                    <th scope="row">{size}</th>
                    <td>{centimetres}</td>
                    <td>{inches}</td>
                    <td className={styles.choiceCell}>
                      {offered ? (
                        <button
                          type="button"
                          className={`${styles.chooseButton}${selected ? ` ${styles.chosen}` : ''}`}
                          aria-label={`${selected ? 'Keep' : 'Select'} ${size}, ${centimetres} centimetres`}
                          aria-pressed={selected}
                          onClick={() => selectSize(size)}
                        >
                          {selected && <Check size={13} aria-hidden="true" />}
                          <span>{selected ? 'Selected' : 'Choose'}</span>
                        </button>
                      ) : (
                        <span className={styles.notOffered} title="Not offered for this print">Not offered</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className={styles.note}>
          Unframed dimensions, shown as width × height. For landscape prints, swap width and height. Inch values are rounded.
        </p>
      </div>
    </ProductDialog>
  );
}
