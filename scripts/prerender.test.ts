// Regression #227 — closeAll must tear down the preview server even
// when the Playwright browser handle is undefined (chromium.launch
// threw before assignment). The previous shape declared `const browser
// = await chromium.launch()` outside any try, so a failed launch left
// the preview server bound to port 4173 and made local re-runs hit
// `Error: listen EADDRINUSE :::4173` until the kernel reclaimed the
// socket.
import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error — .mjs ESM script, no types file
import { closeAll } from './prerender.mjs';

interface FakeServer {
  httpServer: { close: (cb: () => void) => void };
}

function makeFakeServer(): FakeServer & { closeMock: ReturnType<typeof vi.fn> } {
  const closeMock = vi.fn((cb: () => void) => cb());
  return {
    httpServer: { close: closeMock },
    closeMock,
  } as FakeServer & { closeMock: ReturnType<typeof vi.fn> };
}

describe('closeAll', () => {
  it('closes the server even when browser is undefined', async () => {
    const server = makeFakeServer();
    const results = await closeAll(undefined, server);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(server.closeMock).toHaveBeenCalledTimes(1);
  });

  it('closes both browser and server on the happy path', async () => {
    const browserClose = vi.fn().mockResolvedValue(undefined);
    const browser = { close: browserClose };
    const server = makeFakeServer();
    await closeAll(browser, server);
    expect(browserClose).toHaveBeenCalledTimes(1);
    expect(server.closeMock).toHaveBeenCalledTimes(1);
  });

  it('still closes the server when browser.close() rejects', async () => {
    const browser = {
      close: vi.fn().mockRejectedValue(new Error('browser teardown failed')),
    };
    const server = makeFakeServer();
    const results = await closeAll(browser, server);
    // Promise.allSettled means we get one rejection (browser) and one
    // fulfilment (server) — never short-circuit on the first failure.
    expect(results[0]?.status).toBe('rejected');
    expect(results[1]?.status).toBe('fulfilled');
    expect(server.closeMock).toHaveBeenCalledTimes(1);
  });
});
