import { BASE_URL, baseHeaders } from './config';

export async function updateProfile(name: string, token: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: baseHeaders(token),
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка обновления профиля');
  return data;
}

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  restaurantId: string;
  createdAt: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export async function sendOtp(phone: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Ошибка отправки кода');
  }
}

export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/account`, {
    method: 'DELETE',
    headers: baseHeaders(token),
  });
  // 401 = token expired or already deleted — treat as logged out
  if (res.status === 401) return;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Ошибка удаления аккаунта');
  }
}

export async function verifyOtp(
  phone: string,
  code: string,
  name?: string,
): Promise<AuthResult> {
  const body: Record<string, string> = { phone, code };
  if (name?.trim()) body.name = name.trim();

  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Неверный код');
  }
  return data as AuthResult;
}
