import 'server-only';

/**
 * Browser mutations must come from this deployment itself. Authentication is
 * still required, but this blocks a third-party site from using an
 * administrator's browser session to submit a catalogue or order change.
 */
export function hasSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
