import { requireAdmin } from '@/lib/admin-auth';
import Link from 'next/link';
import { LayoutDashboard, Package, ShoppingCart, FolderOpen, Warehouse, Users, ArrowLeft, MessagesSquare } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/admin/messages', label: 'Messages', icon: MessagesSquare },
    { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
    { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
    { href: '/admin/customers', label: 'Customers', icon: Users },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">
            <LayoutDashboard size={20} />
            Admin Panel
          </div>
          <div className="admin-sidebar-subtitle">DreamVault Management</div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="admin-nav-link">
              <item.icon className="nav-icon" size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-nav-link" style={{ fontSize: '0.82rem' }}>
            <ArrowLeft size={16} />
            Back to Store
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
