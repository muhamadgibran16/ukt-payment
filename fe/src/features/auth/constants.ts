/** Akun hasil seed backend; ditampilkan hanya jika VITE_DEMO_PASSWORD diisi. */
export const DEMO_ACCOUNTS = [
  { label: 'Admin UCN', email: 'keuangan@ucn.test' },
  { label: 'Admin ITSB', email: 'keuangan@itsb.test' },
  { label: 'Admin PHB', email: 'keuangan@phb.test' },
  { label: 'Mhs UCN (Andi)', email: 'andi@ucn.test' },
  { label: 'Mhs ITSB (Eka)', email: 'eka@itsb.test' },
  { label: 'Mhs PHB (Indra)', email: 'indra@phb.test' },
] as const;
