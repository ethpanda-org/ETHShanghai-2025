const API_BASE_URL = 'https://api.familykey.xyz/';

export const apiUrl = (path: string) => new URL(path, API_BASE_URL).toString();

export { API_BASE_URL };
