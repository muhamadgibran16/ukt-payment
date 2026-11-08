const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Environment variable ${name} wajib diisi (lihat fe/.env.example).`);
  return value;
};

export const env = {
  API_URL: import.meta.env.VITE_API_URL || '/api/v1',
  /** Zona waktu institusi untuk tampilan tanggal & batas bayar, mis. "Asia/Jakarta". */
  APP_TIMEZONE: required('VITE_APP_TIMEZONE', import.meta.env.VITE_APP_TIMEZONE),
  /** Opsional: jika diisi, halaman login menampilkan akun demo dengan password ini. */
  DEMO_PASSWORD: import.meta.env.VITE_DEMO_PASSWORD || null,
} as const;
