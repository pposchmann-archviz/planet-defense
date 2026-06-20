import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base: im Production-Build unter dem GitHub-Pages-Projektpfad; lokal an der Wurzel.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/planet-defense/' : '/',
  plugins: [svelte()] as any[],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
