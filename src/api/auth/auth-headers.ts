import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

// Заголовки запроса для серверных вызовов auth.api.*. better-auth берёт
// IP только из заголовков, поэтому подставляем req.ip: Express вычисляет
// его с учётом trust proxy, и клиент не может подделать адрес.
export function toAuthHeaders(request: Request): Headers {
  const headers = fromNodeHeaders(request.headers);

  if (request.ip) {
    headers.set('x-forwarded-for', request.ip);
  }

  return headers;
}
