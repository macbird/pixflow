import axios from 'axios';

export function getApiErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

export function isApiNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response == null;
}

export function isApiAuthError(error: unknown): boolean {
  const status = getApiErrorStatus(error);
  return status === 401 || status === 403;
}
