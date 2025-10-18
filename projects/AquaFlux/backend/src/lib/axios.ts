import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from '@/config';

/**
 * Creates and configures a singleton Axios instance for the application.
 *
 * This instance is configured with:
 * - Default JSON content type headers.
 * - An HTTP proxy agent for development environments if `HTTP_PROXY` is set in the config.
 *
 * @returns A configured AxiosInstance.
 */
const createAxiosInstance = (): AxiosInstance => {
  const proxyAgent =
    config.isDevelopment && config.httpProxy
      ? new HttpsProxyAgent(config.httpProxy)
      : undefined;

  return axios.create({
    headers: {
      'Content-Type': 'application/json',
    },
    httpsAgent: proxyAgent,
  });
};

// Export a singleton instance to be used across the application.
export const httpClient: AxiosInstance = createAxiosInstance();
