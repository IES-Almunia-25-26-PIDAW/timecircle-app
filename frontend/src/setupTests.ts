import '@testing-library/jest-dom'

// Optional: mock next-themes for components that use it during tests
import { vi } from 'vitest'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: () => {},
    resolvedTheme: 'light',
  }),
}))

// Ensure Vite env is available during tests so client.BASE_URL isn't undefined
vi.stubEnv('VITE_API_URL', 'http://test.local')

// Prevent real network calls during tests by default.
// Individual tests can spyOn/client.apiFetch to override this behavior.
globalThis.fetch = vi.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ results: [] }),
} as any));

// Mock ResizeObserver for recharts and similar libraries
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any
