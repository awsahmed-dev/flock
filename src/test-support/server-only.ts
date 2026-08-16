// `server-only` throws outside a React Server Component, which stops vitest
// importing anything under src/lib/actions. Aliased in vitest.config.ts so
// server actions can be tested; never bundled into the app.
export {};
