import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  getToken: () => string | null;
  getLocale?: () => string;
  onError?: (error: unknown, status?: number) => void;
}

export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
  });

  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const token = config.getToken();
    if (token) {
      req.headers.set('Authorization', `Bearer ${token}`);
    }
    const locale = config.getLocale?.() ?? 'en';
    req.headers.set('Accept-Language', locale);
    return req;
  });

  client.interceptors.response.use(
    (res) => res,
    (error) => {
      const status: number | undefined = error?.response?.status;
      config.onError?.(error, status);
      return Promise.reject(error);
    },
  );

  return client;
}

export type { AxiosInstance };
