import prisma from '@/lib/prisma';
import StockEditor from './StockEditor';

export default async function AdminInventory() {
  const variants = await prisma.productVariant.findMany({
    orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }],
    include: { product: { select: { name: true, image: true, status: true } } },
  });

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const outOfStock = variants.filter((v) => v.stock === 0).length;
  const lowStock = variants.filter((v) => v.stock > 0 && v.stock <= 5).length;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Inventory</h1>
          <p className="admin-page-subtitle">{variants.length} variants · {totalStock} total units</p>
        </div>
      </div>

      {/* Inventory KPIs */}
      <div className="admin-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">📦 Total Variants</div>
          <div className="admin-kpi-value">{variants.length}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">✅ Total Units</div>
          <div className="admin-kpi-value">{totalStock}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">⚠️ Low Stock</div>
          <div className="admin-kpi-value" style={{ color: lowStock > 0 ? '#f59e0b' : 'inherit' }}>{lowStock}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">🔴 Out of Stock</div>
          <div className="admin-kpi-value" style={{ color: outOfStock > 0 ? '#ef4444' : 'inherit' }}>{outOfStock}</div>
        </div>
      </div>

      <StockEditor
        initialVariants={variants.map((v) => ({
          id: v.id,
          size: v.size,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          sku: v.sku,
          stock: v.stock,
          productName: v.product.name,
          productImage: v.product.image,
          productStatus: v.product.status,
        }))}
      />
    </>
  );
}
