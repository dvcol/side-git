/** PKCE (RFC 7636) + state helpers built on the Web Crypto API — no dependency needed. */

const PLUS_REGEX = /\+/g;
const SLASH_REGEX = /\//g;
const PADDING_REGEX = /=+$/;

/** Base64url-encode bytes without padding (RFC 7636 §A). */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(PLUS_REGEX, '-').replace(SLASH_REGEX, '_').replace(PADDING_REGEX, '');
}

/** Random URL-safe string of `length` bytes, used for the verifier and `state`. */
export function randomToken(length = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(length)));
}

/** S256 challenge for a verifier: base64url(SHA-256(verifier)). */
export async function challengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: 'S256';
}

/** Generate a PKCE verifier/challenge pair. */
export async function createPkcePair(): Promise<PkcePair> {
  const verifier = randomToken(32);
  return { verifier, challenge: await challengeFromVerifier(verifier), method: 'S256' };
}
