import { defineConfig } from 'vite';

// ตั้ง base ให้ตรงกับชื่อ GitHub repository สำหรับ GitHub Pages
export default defineConfig({
  base: '/CelestiaLab/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
