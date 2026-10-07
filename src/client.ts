// Client for the public Private SuperIntelligence API.
// Spec: https://privatesuperintelligence.si/openapi.json. No API key needed.

export const DEFAULT_BASE_URL = 'https://privatesuperintelligence.si/api/v1';

export type RevenueBand =
  | 'under-10m' | '10m-50m' | '50m-250m' | '250m-1b' | '1b-5b' | '5b-plus' | 'not-applicable' | 'prefer-not-to-disclose';

export interface PrivacyLayer { id: string; order: number; name: string; covers: string }
export interface Metric { id: string; label: string; value: number; unit: string; qualifier?: string }
export interface Benchmarks { metrics: Metric[]; methodology: string }
export interface Definition { term: string; text: string; url: string; related?: { term: string; note: string }[] }
export interface Service {
  name: string; url: string; summary: string; pricing: string; audiences: string[];
  operator: { name: string; url: string; location: string }; founder: { name: string; role: string };
  availability: { status: string; detail: string; howToJoin: string; bookingEligibleBands: RevenueBand[] };
  definition: Definition; benchmarks: Benchmarks; privacyLayers: PrivacyLayer[]; links: Record<string, string>;
}
export interface Passage { title: string; section: string; url: string; markdownUrl: string; text: string; score: number }
export interface InterestInput {
  email: string;
  jobTitle: string;
  annualRevenueBand: RevenueBand;
  /** True only after the person approved these exact details. */
  userConfirmed: boolean;
  /** Validate and preview booking eligibility without submitting. */
  dryRun?: boolean;
}
export interface InterestResult {
  registered?: boolean; dryRun?: boolean; valid?: boolean; bookingEligible?: boolean;
  bookingUrl?: string; bookingNote?: string; message: string;
}

/** An RFC 9457 problem returned by the API. */
export class PrivateSuperIntelligenceError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly hint?: string, readonly errors?: string[], readonly retryAfter?: number) {
    super(message);
    this.name = 'PrivateSuperIntelligenceError';
  }
}

export interface ClientOptions { baseUrl?: string; fetch?: typeof fetch; userAgent?: string }

export class PrivateSuperIntelligence {
  readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly userAgent: string;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.userAgent = options.userAgent ?? 'private-superintelligence-sdk';
  }

  service() { return this.get<Service>('/service'); }
  definition() { return this.get<Definition>('/definition'); }
  privacyLayers() { return this.get<{ layers: PrivacyLayer[]; note: string }>('/privacy-layers'); }
  benchmarks() { return this.get<Benchmarks>('/benchmarks'); }
  faq() { return this.get<{ questions: { question: string; answer: string }[] }>('/faq'); }
  revenueBands() { return this.get<{ currency: 'USD'; bands: { id: RevenueBand; label: string; bookingEligible: boolean }[] }>('/revenue-bands'); }
  status() { return this.get<{ status: string; time: string; version: string }>('/status'); }
  search(query: string, limit = 5) {
    return this.get<{ query: string; count: number; results: Passage[] }>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  /** Join the waitlist. Pass the same idempotencyKey when retrying. */
  registerInterest(input: InterestInput, options: { idempotencyKey?: string } = {}) {
    return this.request<InterestResult>('/interest', { method: 'POST', body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': options.idempotencyKey ?? crypto.randomUUID() } });
  }

  private get<T>(path: string) { return this.request<T>(path, { method: 'GET' }); }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers: { Accept: 'application/json', 'User-Agent': this.userAgent, ...init.headers } });
    const text = await response.text();
    let body: Record<string, unknown> = {};
    try { body = text ? JSON.parse(text) : {}; } catch { /* non-JSON error below */ }
    if (!response.ok) {
      const retry = response.headers.get('retry-after');
      throw new PrivateSuperIntelligenceError(response.status, String(body.code ?? 'http_error'), String(body.detail ?? `HTTP ${response.status}`),
        typeof body.hint === 'string' ? body.hint : undefined, Array.isArray(body.errors) ? body.errors as string[] : undefined, retry ? Number(retry) : undefined);
    }
    return body as T;
  }
}
