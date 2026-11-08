import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'serve' && !env.VITE_PROXY_TARGET) {
    throw new Error('VITE_PROXY_TARGET wajib diisi untuk dev server (lihat fe/.env.example).');
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // Dev: teruskan /api ke backend agar tidak perlu CORS & sama seperti produksi (nginx).
      proxy: { '/api': env.VITE_PROXY_TARGET },
    },
  };
});
