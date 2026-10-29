import prisma from '@/lib/prisma';
import StockEditor from './StockEditor';

export default async function AdminInventory() {
  const variants = await prisma.productVariant.findMany({
    orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }, { format: 'asc' }, { frame: 'asc' }],
    include: { product: { select: { name: true, image: true, status: true } } },
  });
  const onHand = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const held = variants.reduce((sum, variant) => sum + variant.reservedStock, 0);
  const available = onHand - held;
  const unavailable = variants.filter((variant) => variant.stock - variant.reservedStock <= 0).length;
  const lowStock = variants.filter((variant) => {
    const remaining = variant.stock - variant.reservedStock;
    return remaining > 0 && remaining <= 5;
  }).length;

  return <>
    <div className="admin-page-header"><div><h1 className="admin-page-title">Inventory</h1><p className="admin-page-subtitle">{variants.length} configurations · {available} units available to sell</p></div></div>
    <div className="admin-kpi-grid" style={{ marginBottom: '1.5rem' }}>
      <div className="admin-kpi-card"><div className="admin-kpi-label">Configurations</div><div className="admin-kpi-value">{variants.length}</div></div>
      <div className="admin-kpi-card"><div className="admin-kpi-label">On-hand units</div><div className="admin-kpi-value">{onHand}</div></div>
      <div className="admin-kpi-card"><div className="admin-kpi-label">Checkout holds</div><div className="admin-kpi-value" style={{ color: held > 0 ? '#b38600' : 'inherit' }}>{held}</div></div>
      <div className="admin-kpi-card"><div className="admin-kpi-label">Low / unavailable</div><div className="admin-kpi-value" style={{ color: lowStock || unavailable ? '#b45309' : 'inherit' }}>{lowStock} / {unavailable}</div></div>
    </div>
    <StockEditor initialVariants={variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      format: variant.format as 'POSTER' | 'ART_PRINT' | 'FRAMED_ART_PRINT',
      paper: variant.paper as 'CLASSIC_MATTE' | 'PREMIUM_FINE_ART',
      frame: variant.frame as 'NONE' | 'BLACK' | 'WHITE' | 'NATURAL_OAK' | 'WALNUT',
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      sku: variant.sku,
      stock: variant.stock,
      reservedStock: variant.reservedStock,
      productName: variant.product.name,
      productImage: variant.product.image,
      productStatus: variant.product.status,
    }))} />
  </>;
}
