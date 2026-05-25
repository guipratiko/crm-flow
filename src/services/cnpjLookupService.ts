/** Resposta parcial da Brasil API / Minha Receita — mesmo schema JSON */

export type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  logradouro?: string;
  descricao_tipo_de_logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string }>;
};

export type CnpjLookupResult = {
  document: string;
  legalName: string;
  tradeName: string | null;
  phone: string | null;
  address: string | null;
  partners: string[];
};

const HTTP_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'OnlyFlow-CRM/1.0 (+https://onlyflow.com.br)',
};

const LOOKUP_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 600;

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCep(cep: string): string {
  const d = digitsOnly(cep);
  if (d.length !== 8) return cep;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatPhoneFromApi(raw: string | undefined): string | null {
  const d = digitsOnly(raw || '');
  if (d.length < 10 || /^0+$/.test(d)) return null;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest}`;
}

function buildAddress(data: BrasilApiCnpjResponse): string | null {
  const street = [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' ').trim();
  const parts = [
    street || null,
    data.numero ? `nº ${data.numero}` : null,
    data.complemento?.trim() || null,
    data.bairro?.trim() || null,
    [data.municipio, data.uf].filter(Boolean).join(' - ') || null,
    data.cep ? `CEP ${formatCep(data.cep)}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function extractPartners(data: BrasilApiCnpjResponse): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const entry of data.qsa || []) {
    const name = String(entry.nome_socio || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function mapResponse(document: string, data: BrasilApiCnpjResponse): CnpjLookupResult {
  const legalName = String(data.razao_social || '').trim();
  if (!legalName) {
    throw new Error('Resposta inválida da consulta de CNPJ.');
  }
  const tradeRaw = String(data.nome_fantasia || '').trim();
  const phone = formatPhoneFromApi(data.ddd_telefone_1) || formatPhoneFromApi(data.ddd_telefone_2);
  return {
    document,
    legalName,
    tradeName: tradeRaw || null,
    phone,
    address: buildAddress(data),
    partners: extractPartners(data),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchCnpjJson(url: string): Promise<BrasilApiCnpjResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HTTP_HEADERS, signal: controller.signal });
    if (res.status === 404) {
      throw new Error('CNPJ não encontrado na Receita Federal.');
    }
    if (!res.ok) {
      const err = new Error(`Consulta retornou HTTP ${res.status}.`);
      if (isRetryableStatus(res.status)) throw err;
      throw new Error('Não foi possível consultar o CNPJ. Tente novamente.');
    }
    return (await res.json()) as BrasilApiCnpjResponse;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetries(url: string, attempts = 2): Promise<BrasilApiCnpjResponse> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchCnpjJson(url);
    } catch (e) {
      lastError = e;
      if (e instanceof Error && /não encontrado/i.test(e.message)) throw e;
      if (e instanceof Error && e.name === 'AbortError') {
        lastError = new Error('Consulta de CNPJ expirou. Tente novamente.');
      }
      const retryable =
        e instanceof Error &&
        (/HTTP 429|HTTP 502|HTTP 503|HTTP 504/.test(e.message) || e.name === 'AbortError');
      if (i < attempts - 1 && retryable) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

const providers = (document: string) => [
  { name: 'brasilapi', url: `https://brasilapi.com.br/api/cnpj/v1/${document}` },
  { name: 'minhareceita', url: `https://minhareceita.org/${document}` },
];

export async function lookupCnpjFromBrasilApi(cnpj: string): Promise<CnpjLookupResult> {
  const document = digitsOnly(cnpj);
  if (document.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos.');
  }

  const failures: string[] = [];

  for (const provider of providers(document)) {
    try {
      const data = await fetchWithRetries(provider.url);
      return mapResponse(document, data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erro desconhecido';
      failures.push(`${provider.name}: ${msg}`);
      console.warn(`[CRM-Flow CNPJ lookup] ${provider.name} falhou (${document}):`, msg);
    }
  }

  throw new Error(
    failures[0] || 'Serviço de consulta de CNPJ indisponível. Tente novamente em alguns instantes.'
  );
}
