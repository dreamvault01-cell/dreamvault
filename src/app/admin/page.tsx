import prisma from '@/lib/prisma';
import { IndianRupee, ShoppingCart, Package, Clock, TrendingUp } from 'lucide-react';
import Image from 'next/image';

export default async function AdminDashboard() {
  const [totalRevenue, totalOrders, pendingOrders, totalProducts, recentOrders] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.product.count(),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    }),
  ]);

  const revenue = totalRevenue._sum.totalAmount || 0;

  const statusClass = (status: string) => {
    return `admin-status admin-status-${status.toLowerCase()}`;
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Overview of your store performance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <IndianRupee size={16} /> Total Revenue
          </div>
          <div className="admin-kpi-value">₹{revenue.toLocaleString('en-IN')}</div>
          <div className="admin-kpi-change">From paid orders</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <ShoppingCart size={16} /> Total Orders
          </div>
          <div className="admin-kpi-value">{totalOrders}</div>
          <div className="admin-kpi-change">All time</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <Clock size={16} /> Pending Orders
          </div>
          <div className="admin-kpi-value">{pendingOrders}</div>
          <div className="admin-kpi-change">Awaiting action</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <Package size={16} /> Total Products
          </div>
          <div className="admin-kpi-value">{totalProducts}</div>
          <div className="admin-kpi-change">In catalog</div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} /> Recent Orders
            </div>
          </div>
        </div>
        {recentOrders.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📦</div>
            <p>No orders yet. They&apos;ll appear here once customers start ordering.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <div className="admin-table-product-name">{order.shippingName}</div>
                      <div className="admin-table-product-sub">{order.shippingCity}, {order.shippingState}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {order.items.slice(0, 2).map((item) => (
                          <Image
                            key={item.id}
                            src={item.product.image}
                            alt={item.product.name}
                            width={42}
                            height={52}
                            className="admin-table-thumb"
                          />
                        ))}
                        {order.items.length > 2 && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                            +{order.items.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{order.totalAmount.toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.82rem' }}>{order.paymentMethod}</td>
                    <td>
                      <span className={statusClass(order.status)}>{order.status}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
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
