import { vi, describe, beforeEach, test, expect } from 'vitest';

import {
  apiRequestPasswordReset,
  apiConfirmPasswordReset,
  apiSendContactMessage,
} from '../app/api/endpoints';

describe('api endpoints (auth/contact)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('apiRequestPasswordReset resolves when response ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sent: true }) });
    (global as any).fetch = fetchMock;

    const res = await apiRequestPasswordReset('a@b.com');
    expect(res).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalled();
  });

  test('apiRequestPasswordReset throws when response not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'bad' }) });
    (global as any).fetch = fetchMock;

    await expect(apiRequestPasswordReset('x@y.com')).rejects.toEqual({ error: 'bad' });
  });

  test('apiConfirmPasswordReset resolves when response ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    (global as any).fetch = fetchMock;

    const res = await apiConfirmPasswordReset('a@b.com', '1234', 'pwd');
    expect(res).toEqual({ success: true });
  });

  test('apiConfirmPasswordReset throws when response not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: 'bad' }) });
    (global as any).fetch = fetchMock;

    await expect(apiConfirmPasswordReset('a@b.com', '1234', 'pwd')).rejects.toEqual({ code: 'bad' });
  });

  test('apiSendContactMessage resolves on 201', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, json: async () => ({ created: true }) });
    (global as any).fetch = fetchMock;

    const res = await apiSendContactMessage({ name: 'x', email: 'a@b', reason: 'r', message: 'm' });
    expect(res).toEqual({ created: true });
  });

  test('apiSendContactMessage throws on non-201', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 400, json: async () => ({ msg: 'bad' }) });
    (global as any).fetch = fetchMock;

    await expect(apiSendContactMessage({ name: 'x', email: 'a@b', reason: 'r', message: 'm' })).rejects.toEqual({ msg: 'bad' });
  });
});
