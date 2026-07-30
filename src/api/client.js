const API_URL = import.meta.env.VITE_API_URL;

// Token'i localStorage'da tutuyoruz - sayfa yenilense bile (F5) kullanici
// tekrar giris yapmak zorunda kalmasin diye. Bu, gecici bir kafe-ici POS
// uygulamasi icin kabul edilebilir bir tercih (backend zaten guvenlik
// sertlestirmeyi bilerek sona birakti, bkz. CLAUDE.md).
const TOKEN_KEY = 'airport_cafe_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Backend'in her hata cevabinda { error: "mesaj" } sekli doner (bkz.
// errorHandler.js). Bu sinif, o mesaji ve HTTP durum kodunu birlikte tasir -
// component'ler catch(err) ile err.message'i dogrudan ekranda gosterebilir.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Tum backend cagrilari bu fonksiyondan gecer. path orn: '/orders'.
export async function apiFetch(path, { method = 'GET', body, skipAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content'te govde yok - JSON parse etmeye calismak hataya yol acar.
  const data = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    throw new ApiError(data?.error || 'Bilinmeyen bir hata olustu.', res.status);
  }

  return data;
}
