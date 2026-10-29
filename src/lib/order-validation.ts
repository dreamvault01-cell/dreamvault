import { FULFILLMENT_ACTIONS, ORDER_ADMIN_ACTIONS, type FulfillmentAction, type OrderAdminAction } from './order-types';

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERENCE = /^DV-[A-Z0-9-]{8,64}$/;

export interface CheckoutLineInput {
  id: string;
  variantId: string;
  quantity: number;
  expectedUnitPrice: number;
}

export interface CheckoutShippingInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
}

export interface ValidatedCheckoutInput {
  items: CheckoutLineInput[];
  shipping: CheckoutShippingInput;
  paymentMethod: 'RAZORPAY' | 'COD';
}

function cleanText(value: unknown, field: string, maxLength: number, minLength = 1) {
  if (typeof value !== 'string') throw new OrderValidationError(`${field} is required.`);
  const result = value.trim();
  if (result.length < minLength) throw new OrderValidationError(`${field} is required.`);
  if (result.length > maxLength || CONTROL_CHARACTERS.test(result)) throw new OrderValidationError(`${field} is invalid.`);
  return result;
}

export function normalizeCustomerEmail(value: unknown) {
  const email = cleanText(value, 'Email address', 254).toLowerCase();
  if (!EMAIL.test(email)) throw new OrderValidationError('Enter a valid email address.');
  return email;
}

export function normalizeOrderReference(value: unknown) {
  if (typeof value !== 'string') throw new OrderValidationError('Enter a valid order reference.');
  const reference = value.trim().toUpperCase();
  if (!REFERENCE.test(reference)) throw new OrderValidationError('Enter the order reference exactly as shown in your order email.');
  return reference;
}

export function validateCheckoutPayload(value: unknown): ValidatedCheckoutInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OrderValidationError('Invalid checkout request.');
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 25) {
    throw new OrderValidationError('Your cart needs between 1 and 25 different items.');
  }
  const items = input.items.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new OrderValidationError('A cart item is invalid.');
    const item = raw as Record<string, unknown>;
    const id = cleanText(item.id, 'Product', 191);
    const variantId = cleanText(item.variantId, 'Product configuration', 191);
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new OrderValidationError('Each quantity must be a whole number between 1 and 99.');
    }
    const expectedUnitPrice = item.expectedUnitPrice;
    if (typeof expectedUnitPrice !== 'number' || !Number.isFinite(expectedUnitPrice) || expectedUnitPrice <= 0 || expectedUnitPrice > 1_000_000) {
      throw new OrderValidationError('Please review the current price of each selected print before checking out.');
    }
    return { id, variantId, quantity, expectedUnitPrice };
  });

  const shippingValue = input.shippingDetails;
  if (!shippingValue || typeof shippingValue !== 'object' || Array.isArray(shippingValue)) throw new OrderValidationError('Shipping details are required.');
  const shippingInput = shippingValue as Record<string, unknown>;
  const shipping = {
    name: cleanText(shippingInput.name, 'Name', 120, 2),
    email: normalizeCustomerEmail(shippingInput.email),
    phone: cleanText(shippingInput.phone, 'Phone number', 30, 6),
    address: cleanText(shippingInput.address, 'Address', 300, 6),
    city: cleanText(shippingInput.city, 'City', 100, 2),
    state: cleanText(shippingInput.state, 'State', 100, 2),
    pin: cleanText(shippingInput.pin, 'PIN code', 20, 3),
  };

  const paymentMethod = input.paymentMethod === 'COD' ? 'COD' : input.paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : null;
  if (!paymentMethod) throw new OrderValidationError('Choose a valid payment method.');
  return { items, shipping, paymentMethod };
}

export function validateFulfillmentAction(value: unknown): FulfillmentAction {
  if (typeof value !== 'string' || !(FULFILLMENT_ACTIONS as readonly string[]).includes(value)) {
    throw new OrderValidationError('Choose a valid fulfilment action.');
  }
  return value as FulfillmentAction;
}

export function validateOrderAdminAction(value: unknown): OrderAdminAction {
  if (typeof value !== 'string' || !(ORDER_ADMIN_ACTIONS as readonly string[]).includes(value)) {
    throw new OrderValidationError('Choose a valid order action.');
  }
  return value as OrderAdminAction;
}

export function normalizeRazorpayRefundId(value: unknown) {
  if (typeof value !== 'string' || !/^rfnd_[A-Za-z0-9_]{6,191}$/.test(value.trim())) {
    throw new OrderValidationError('Enter the Razorpay refund ID exactly as shown in Razorpay.');
  }
  return value.trim();
}

export function normalizeTrackingInput(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OrderValidationError('Tracking details are required.');
  const input = value as Record<string, unknown>;
  const carrier = cleanText(input.carrier, 'Courier', 100, 2);
  const trackingNumber = cleanText(input.trackingNumber, 'Tracking number', 100, 3);
  const rawUrl = typeof input.trackingUrl === 'string' ? input.trackingUrl.trim() : '';
  let trackingUrl: string | null = null;
  if (rawUrl) {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.toString().length > 500) throw new Error();
      trackingUrl = url.toString();
    } catch {
      throw new OrderValidationError('Tracking link must be a valid HTTPS URL.');
    }
  }
  return { carrier, trackingNumber, trackingUrl };
}

export function normalizeCancellationReason(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  return cleanText(value, 'Cancellation reason', 300, 3);
}
