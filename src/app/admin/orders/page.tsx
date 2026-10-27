import prisma from '@/lib/prisma';
import Image from 'next/image';
import OrderStatusSelect from './OrderStatusSelect';

export default async function AdminOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: true } },
      user: true,
    },
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Orders</h1>
          <p className="admin-page-subtitle">{orders.length} total orders</p>
        </div>
      </div>

      <div className="admin-table-wrap">
        {orders.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📦</div>
            <p>No orders yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Shipping</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <div className="admin-table-product-name">{order.shippingName}</div>
                      <div className="admin-table-product-sub">{order.user?.email || order.shippingPhone}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {order.items.slice(0, 3).map((item) => (
                          <Image
                            key={item.id}
                            src={item.product.image}
                            alt={item.product.name}
                            width={36}
                            height={45}
                            className="admin-table-thumb"
                            style={{ width: '36px', height: '45px' }}
                          />
                        ))}
                        {order.items.length > 3 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            +{order.items.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{order.totalAmount.toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.82rem' }}>{order.paymentMethod}</td>
                    <td>
                      <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      <div>{order.shippingAddress}</div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {order.shippingCity}, {order.shippingState} - {order.shippingPin}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
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
