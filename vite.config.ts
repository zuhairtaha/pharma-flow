import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// عند النشر على GitHub Pages يصبح الموقع تحت المسار
// https://<user>.github.io/<repo>/ لذا نستخدم BASE_PATH في البناء.
// الـ workflow يضبط هذه القيمة تلقائياً من اسم المستودع.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.BASE_PATH ?? '/pharma-flow/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
  },
}));
