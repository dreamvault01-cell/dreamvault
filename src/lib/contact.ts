export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { min: 3, max: 254 },
  subject: { min: 3, max: 150 },
  message: { min: 10, max: 5000 },
} as const;

export type ContactField = keyof typeof CONTACT_LIMITS;
export type ContactFormData = Record<ContactField, string>;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export interface ContactSubmission extends ContactFormData {
  submissionId: string;
}

export type ContactValidation =
  | { success: true; data: ContactSubmission }
  | { success: false; error: string; fieldErrors?: ContactFieldErrors };

export function validateContactSubmission(value: unknown): ContactValidation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { success: false, error: 'Please provide a valid contact message.' };
  }

  const input = value as Record<string, unknown>;
  if (typeof input.website !== 'undefined' && input.website !== '') {
    return { success: false, error: 'Unable to submit this message. Please refresh and try again.' };
  }
  if (typeof input.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) {
    return { success: false, error: 'Please refresh the page and try again.' };
  }

  const data = {} as ContactFormData;
  const fieldErrors: ContactFieldErrors = {};
  for (const field of Object.keys(CONTACT_LIMITS) as ContactField[]) {
    const text = typeof input[field] === 'string' ? input[field].trim() : '';
    const { min, max } = CONTACT_LIMITS[field];
    data[field] = text;
    if (text.length < min || text.length > max) {
      fieldErrors[field] = `Please enter ${min}–${max} characters for your ${field}.`;
    }
    if (field !== 'message' && /[\r\n\x00]/.test(text)) {
      fieldErrors[field] = `Please enter a valid ${field} on one line.`;
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    fieldErrors.email = 'Please enter a valid email address.';
  }
  if (data.message.includes('\0')) {
    fieldErrors.message = 'Please remove invalid characters from your message.';
  }
  if (Object.keys(fieldErrors).length) {
    return { success: false, error: 'Please check the highlighted fields.', fieldErrors };
  }

  return { success: true, data: { ...data, email: data.email.toLowerCase(), submissionId: input.submissionId.toLowerCase() } };
}
