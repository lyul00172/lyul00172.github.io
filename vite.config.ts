import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/akai-mpc-live-2/',
  plugins: [react()],
});
