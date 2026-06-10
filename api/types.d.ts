// Minimal request/response surface the Vercel handlers actually use.
// Ambient (no imports/exports) so every function in api/ sees these globally
// without adding @vercel/node as a dependency.

type ApiRequest = {
  query: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};
