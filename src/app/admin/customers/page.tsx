import prisma from '@/lib/prisma';

export default async function AdminCustomers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { orders: true } },
      orders: {
        select: { totalAmount: true },
      },
    },
  });

  const customers = users.map((u) => ({
    ...u,
    totalSpent: u.orders.reduce((sum, o) => sum + o.totalAmount, 0),
  }));

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-subtitle">{customers.length} registered users</p>
        </div>
      </div>

      <div className="admin-table-wrap">
        {customers.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">👥</div>
            <p>No registered customers yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-table-product-name">
                        {user.firstName || ''} {user.lastName || ''}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{user.email}</td>
                    <td style={{ fontWeight: 600 }}>{user._count.orders}</td>
                    <td style={{ fontWeight: 600 }}>₹{user.totalSpent.toLocaleString('en-IN')}</td>
                    <td>
                      <span
                        className={`admin-status ${user.role === 'ADMIN' ? 'admin-status-paid' : 'admin-status-delivered'}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
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
