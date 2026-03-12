const BASE_URL_KEY = 'admin_base_url';
const TOKEN_KEY = 'admin_token';

export const getBaseUrl = () => {
  return localStorage.getItem(BASE_URL_KEY) || 'https://api.criclive.app';
};

export const setBaseUrl = value => {
  localStorage.setItem(BASE_URL_KEY, value);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || '';
};

export const setToken = value => {
  localStorage.setItem(TOKEN_KEY, value);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const request = async (path, {method = 'GET', token = '', body} = {}) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : {'Content-Type': 'application/json'}),
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
};

export const uploadNewsImage = async ({file, token}) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${getBaseUrl()}/api/admin/news/upload-image`, {
    method: 'POST',
    headers: {
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Failed to upload image');
  }

  return payload;
};
