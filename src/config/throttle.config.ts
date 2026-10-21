// Лимиты на IP клиента
export const DEFAULT_THROTTLE = { ttl: 60_000, limit: 120 };

// Анонимные эндпоинты, принимающие пароль: защита от перебора
export const CREDENTIALS_THROTTLE = {
  default: { ttl: 60_000, limit: 10 },
};
