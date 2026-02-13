import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace 'ecosynthesis-ai' with whatever you name your GitHub repo
export default defineConfig({
  plugins: [react()],
  base: './',
});
