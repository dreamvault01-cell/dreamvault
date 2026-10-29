import prisma from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import DeleteProductButton from './DeleteProductButton';

export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      variants: { orderBy: { size: 'asc' } },
      _count: { select: { orderItems: true } },
    },
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Products</h1>
          <p className="admin-page-subtitle">{products.length} products in catalog</p>
        </div>
        <Link href="/admin/products/new" className="admin-btn admin-btn-primary">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      <div className="admin-table-wrap">
        {products.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🎨</div>
            <p>No products yet. Click &quot;Add Product&quot; to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Base Price</th>
                  <th>Variants</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-table-product">
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={42}
                          height={52}
                          className="admin-table-thumb"
                        />
                        <div>
                          <div className="admin-table-product-name">{product.name}</div>
                          <div className="admin-table-product-sub">{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>{product.category.name}</td>
                    <td style={{ fontWeight: 600 }}>₹{product.price}</td>
                    <td>
                      {product.variants.length > 0 ? (
                        <span style={{ fontSize: '0.82rem' }}>
                          {[...new Set(product.variants.map((variant) => variant.size))].join(', ')} · {product.variants.length} configuration{product.variants.length === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>None</span>
                      )}
                    </td>
                    <td>{product._count.orderItems}</td>
                    <td>
                      {product.status === 'ACTIVE' ? (
                        <span className="admin-status admin-status-delivered" style={{ fontSize: '0.75rem' }}>Active</span>
                      ) : (
                        <span className="admin-status admin-status-pending" style={{ fontSize: '0.75rem' }}>Draft</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                        >
                          Edit
                        </Link>
                        <DeleteProductButton productId={product.id} productName={product.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
