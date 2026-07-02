import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['media/src/tests/**/*.test.js'],
        environment: 'node',
    },
});
