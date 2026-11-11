export class ApiError extends Error {
  constructor(status, body) {
    super((body && body.error && body.error.message) || 'Request failed');
    this.status = status;
    this.body = body;
  }
}

export async function api(path, options = {}) {
  const { method = 'GET', body } = options;
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
