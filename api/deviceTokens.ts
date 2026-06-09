import { BASE_URL, baseHeaders } from './config';

export async function registerDeviceToken(
  token: string,
  platform: 'android' | 'ios',
  authToken: string,
): Promise<void> {
  await fetch(`${BASE_URL}/device-tokens`, {
    method: 'POST',
    headers: baseHeaders(authToken),
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterDeviceToken(token: string, authToken: string): Promise<void> {
  await fetch(`${BASE_URL}/device-tokens/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: baseHeaders(authToken),
  });
}
