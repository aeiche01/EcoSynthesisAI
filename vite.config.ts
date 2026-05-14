import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // <-- Removed the extra period here
  base: '/EcoSynthesisAI/', // <-- Changed from './' to your repo name
});
