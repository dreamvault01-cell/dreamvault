'use client';

import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2, CreditCard, ShieldCheck, Truck } from 'lucide-react';
import { getCartItemKey, useCart } from '@/context/CartContext';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayErrorResponse { error: { description?: string }; }
interface RazorpayInstance {
  on(event: 'payment.failed', callback: (response: RazorpayErrorResponse) => void): void;
  open(): void;
}
interface RazorpayConstructor { new (options: Record<string, unknown>): RazorpayInstance; }
declare global { interface Window { Razorpay?: RazorpayConstructor; } }

type PaymentMethod = 'RAZORPAY' | 'COD';

const EMPTY_SHIPPING_FORM = {
  'first-name': '', 'last-name': '', email: '', phone: '', address: '', city: '', pincode: '', state: '',
};

export default function CheckoutPage() {
  const { items, totalPrice, totalSavings, clearCart } = useCart();
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewReference, setReviewReference] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('RAZORPAY');
  const [formEdits, setFormEdits] = useState<Partial<typeof EMPTY_SHIPPING_FORM>>({});
  const formData = {
    ...EMPTY_SHIPPING_FORM,
    ...formEdits,
    email: formEdits.email ?? user?.primaryEmailAddress?.emailAddress ?? '',
    'first-name': formEdits['first-name'] ?? user?.firstName ?? '',
    'last-name': formEdits['last-name'] ?? user?.lastName ?? '',
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in?redirect_url=/checkout');
  }, [isLoaded, isSignedIn, router]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;
    setFormEdits((previous) => ({ ...previous, [id]: value }));
  };

  const handlePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || reviewReference) return;
    setError(null);
    if (items.some((item) => !item.variantId)) {
      setError('Your cart contains an older selection. Return to each product page, choose its print options again, and add it back to the cart.');
      return;
    }
    if (paymentMethod === 'RAZORPAY' && !window.Razorpay) {
      setError('Secure payment is still loading. Please wait a moment, or refresh if your browser blocked it.');
      return;
    }
    inFlight.current = true;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, variantId: item.variantId, quantity: item.quantity, expectedUnitPrice: item.price })),
          paymentMethod,
          shippingDetails: {
            name: `${formData['first-name']} ${formData['last-name']}`.trim(),
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pin: formData.pincode,
          },
        }),
      });
      const orderData: { error?: string; paymentMethod?: PaymentMethod; orderReference?: string; orderId?: string; amount?: number; currency?: string } = await response.json();
      if (!response.ok || !orderData.orderReference) throw new Error(orderData.error || 'We could not start checkout.');

      if (orderData.paymentMethod === 'COD') {
        clearCart();
        router.push(`/checkout/success?order=${encodeURIComponent(orderData.orderReference)}&method=cod`);
        return;
      }
      if (!window.Razorpay || !orderData.orderId || !orderData.amount || !orderData.currency) {
        throw new Error('Secure payment could not load. Please disable an ad blocker, refresh, and try again.');
      }

      const gateway = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DreamVault',
        description: 'Art print order',
        order_id: orderData.orderId,
        prefill: { name: `${formData['first-name']} ${formData['last-name']}`.trim(), email: formData.email, contact: formData.phone },
        theme: { color: '#a57a12' },
        modal: { ondismiss: () => { inFlight.current = false; setIsProcessing(false); } },
        handler: async (payment: RazorpayResponse) => {
          setReviewReference(orderData.orderReference!);
          try {
            const verification = await fetch('/api/checkout/verify', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment),
            });
            const verified: { success?: boolean; pending?: boolean; error?: string; orderReference?: string } = await verification.json();
            if (!verification.ok || !verified.success) throw new Error(verified.error || 'We could not verify the payment yet.');
            clearCart();
            const reference = verified.orderReference || orderData.orderReference;
            if (!reference) throw new Error('Your order reference could not be confirmed. Please contact support before paying again.');
            router.push(`/checkout/success?order=${encodeURIComponent(reference)}${verified.pending ? '&pending=1' : ''}`);
          } catch (verificationError) {
            setError(verificationError instanceof Error ? verificationError.message : 'We could not verify this payment yet. Do not pay again; contact support if needed.');
            inFlight.current = false;
            setIsProcessing(false);
          }
        },
      });
      gateway.on('payment.failed', (failure) => {
        setError(failure.error.description || 'The payment was not completed. No order has been fulfilled.');
      });
      gateway.open();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'We could not start checkout.');
      inFlight.current = false;
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return <div className="container" style={{ paddingTop: 80, minHeight: '60vh', textAlign: 'center' }}><h1>Your cart is empty</h1><p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>Choose a print that belongs on your wall.</p><Link href="/collections" className="btn btn-primary">Explore the collection</Link></div>;
  }
  if (!isLoaded || !isSignedIn) return <div className="container" style={{ paddingTop: 100, minHeight: '60vh', textAlign: 'center' }}>Loading secure checkout…</div>;

  return (
    <main style={{ minHeight: '100vh', paddingTop: 10 }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <section className="section"><div className="container" style={{ maxWidth: 980 }}>
        <div style={{ marginBottom: '2rem' }}><span className="eyebrow">Secure checkout</span><h1 className="section-title" style={{ marginTop: 8 }}>Make it <span className="accent">yours.</span></h1><p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Your exact paper and frame selection is reserved while you complete checkout.</p></div>
        <div className="checkout-layout">
          <form onSubmit={handlePayment}>
            <section aria-labelledby="shipping-heading"><h2 id="shipping-heading" className="checkout-section-title">Delivery details</h2>
              <div className="checkout-form-grid">
                {[
                  ['First name', 'first-name', 'text', false], ['Last name', 'last-name', 'text', false], ['Email', 'email', 'email', true], ['Phone', 'phone', 'tel', true], ['Address', 'address', 'text', true], ['City', 'city', 'text', false], ['PIN code', 'pincode', 'text', false], ['State', 'state', 'text', true],
                ].map(([label, id, type, full]) => <div key={id as string} className={full ? 'checkout-field-full' : ''}><label htmlFor={id as string}>{label}{id === 'last-name' ? ' (optional)' : ''}</label><input id={id as string} type={type as string} value={formData[id as keyof typeof formData]} onChange={handleChange} required={id !== 'last-name'} autoComplete={id === 'address' ? 'street-address' : id === 'first-name' ? 'given-name' : id === 'last-name' ? 'family-name' : id === 'pincode' ? 'postal-code' : id === 'email' ? 'email' : id === 'phone' ? 'tel' : id === 'city' ? 'address-level2' : 'address-level1'} /></div>)}
              </div>
              <p className="checkout-fine-print">We use this email for your order confirmation and delivery updates.</p>
            </section>
            <section aria-labelledby="payment-heading" style={{ marginTop: '2rem' }}><h2 id="payment-heading" className="checkout-section-title">Payment</h2>
              <div className="checkout-payment-options">
                <label className={`checkout-payment-option ${paymentMethod === 'RAZORPAY' ? 'is-selected' : ''}`}><input type="radio" name="payment" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} /><CreditCard size={19} /><span><strong>Pay securely online</strong><small>UPI, cards, netbanking and wallets are shown by Razorpay.</small></span><CheckCircle2 size={18} aria-hidden="true" /></label>
                <label className={`checkout-payment-option ${paymentMethod === 'COD' ? 'is-selected' : ''}`}><input type="radio" name="payment" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /><Truck size={19} /><span><strong>Cash on delivery</strong><small>Pay when your order reaches you.</small></span><CheckCircle2 size={18} aria-hidden="true" /></label>
              </div>
            </section>
            {error && <div className="checkout-error" role="alert">{error}</div>}
            {reviewReference && <p className="checkout-fine-print">Please check this order before making another payment. <Link href={`/orders/${encodeURIComponent(reviewReference)}`}>View order status →</Link></p>}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }} disabled={isProcessing || Boolean(reviewReference)}>{reviewReference ? 'Check your order status' : isProcessing ? 'Preparing secure checkout…' : paymentMethod === 'COD' ? `Place cash-on-delivery order · ₹${totalPrice}` : `Pay securely · ₹${totalPrice}`}</button>
            <div className="checkout-security"><ShieldCheck size={16} /> <span>Your final price and availability are confirmed securely on the server.</span></div>
          </form>
          <aside className="checkout-summary"><h2 className="checkout-section-title">Your selection</h2>
            {items.map((item) => <div className="checkout-line" key={getCartItemKey(item)}><Image src={item.image} alt={item.name} width={56} height={70} /><div><strong>{item.name}</strong><span>{item.size} · {item.quantity} {item.quantity === 1 ? 'print' : 'prints'}</span>{item.configurationLabel && <small>{item.configurationLabel}</small>}</div><b>₹{item.price * item.quantity}</b></div>)}
            <div className="checkout-totals"><div><span>Subtotal</span><b>₹{totalPrice}</b></div>{totalSavings > 0 && <div className="saving"><span>Selection savings</span><b>−₹{totalSavings}</b></div>}<div><span>Delivery</span><b>Free</b></div><div className="total"><span>Total</span><b>₹{totalPrice}</b></div></div>
          </aside>
        </div>
      </div></section>
    </main>
  );
}
