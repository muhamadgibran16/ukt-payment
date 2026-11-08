import { computeSignature, verifySignature } from './signature';

describe('webhook signature', () => {
  const secret = 'secret-institusi-a';
  const body = '{"event_id":"evt_1","amount":4500000}';
  const valid = computeSignature(secret, body);

  it('produces the known HMAC-SHA256 hex digest', () => {
    // Nilai acuan: printf '%s' "$body" | openssl dgst -sha256 -hmac "$secret"
    expect(
      computeSignature('key', 'The quick brown fox jumps over the lazy dog'),
    ).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });

  it('accepts a valid signature, plain or with sha256= prefix, any case', () => {
    expect(verifySignature(secret, body, valid)).toBe(true);
    expect(verifySignature(secret, body, `sha256=${valid}`)).toBe(true);
    expect(
      verifySignature(secret, Buffer.from(body), valid.toUpperCase()),
    ).toBe(true);
  });

  it('rejects a signature made with another institution secret', () => {
    expect(verifySignature('secret-institusi-b', body, valid)).toBe(false);
  });

  it('rejects when the body was modified (even whitespace)', () => {
    expect(verifySignature(secret, body.replace(':', ': '), valid)).toBe(false);
    expect(verifySignature(secret, body.replace('4500000', '1'), valid)).toBe(
      false,
    );
  });

  it.each([undefined, null, '', 'abc', 'zz'.repeat(32), valid.slice(0, 63)])(
    'rejects missing/malformed header %p',
    (header) => {
      expect(verifySignature(secret, body, header)).toBe(false);
    },
  );
});
