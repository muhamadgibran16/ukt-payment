const TOKEN_KEY = 'ukt.accessToken';

/**
 * Token disimpan di localStorage agar sesi bertahan saat reload.
 * Trade-off (dicatat di DECISIONS.md): rentan dicuri jika ada XSS; untuk
 * produksi lebih aman memakai cookie httpOnly.
 */
export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage tidak tersedia */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage tidak tersedia */
    }
  },
};
