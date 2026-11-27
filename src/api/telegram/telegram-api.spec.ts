import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../../config/index.js';
import { TelegramApi } from './telegram-api.js';
import { startRetryDelayMs } from './telegram-bot.runner.js';

function createApi(env: Partial<Env>): TelegramApi {
  const config = {
    get: (key: keyof Env) => env[key],
  } as unknown as ConfigService<Env, true>;

  return new TelegramApi(config);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

describe('TelegramApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls api.telegram.org directly by default', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, result: true }));
    vi.stubGlobal('fetch', fetchMock);

    await createApi({ TELEGRAM_BOT_TOKEN: '123:abc' }).sendMessage(1, 'hi');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bot123:abc/sendMessage');
    expect(init.headers).not.toHaveProperty('x-proxy-secret');
  });

  it('goes through the proxy with the secret header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, result: true }));
    vi.stubGlobal('fetch', fetchMock);

    await createApi({
      TELEGRAM_BOT_TOKEN: '123:abc',
      TELEGRAM_API_URL: 'https://tg-proxy.example.com',
      TELEGRAM_API_PROXY_SECRET: 'proxy-secret-0123456789',
    }).sendMessage(1, 'hi');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://tg-proxy.example.com/bot123:abc/sendMessage');
    expect(init.headers).toMatchObject({
      'x-proxy-secret': 'proxy-secret-0123456789',
    });
  });

  it('explains a non-JSON answer from the proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>403 Forbidden</html>', {
          status: 403,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    );

    await expect(
      createApi({ TELEGRAM_BOT_TOKEN: '123:abc' }).sendMessage(1, 'hi'),
    ).rejects.toThrow('HTTP 403 without JSON body');
  });
});

describe('startRetryDelayMs', () => {
  it('doubles up to five minutes', () => {
    expect(startRetryDelayMs(1)).toBe(5_000);
    expect(startRetryDelayMs(2)).toBe(10_000);
    expect(startRetryDelayMs(20)).toBe(300_000);
  });
});
