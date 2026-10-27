'use client';

import { useState } from 'react';

interface OrderStatusSelectProps {
  orderId: string;
  currentStatus: string;
}

const statuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function OrderStatusSelect({ orderId, currentStatus }: OrderStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      className="admin-form-input"
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      style={{
        padding: '5px 10px',
        fontSize: '0.78rem',
        fontWeight: 700,
        width: 'auto',
        minWidth: '120px',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
