import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("verifyCaptcha", () => {
  const originalSecret = process.env.HCAPTCHA_SECRET_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.HCAPTCHA_SECRET_KEY = originalSecret;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fails closed on an empty token when a secret is configured", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "test-secret";
    const { verifyCaptcha } = await import("./hcaptcha");
    expect(await verifyCaptcha("")).toBe(false);
  });

  it("calls the real hCaptcha siteverify endpoint and returns true on success", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "test-secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { verifyCaptcha } = await import("./hcaptcha");
    const result = await verifyCaptcha("a-real-looking-token");

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hcaptcha.com/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
    const [, options] = fetchMock.mock.calls[0];
    const sentBody = (options.body as URLSearchParams).toString();
    expect(sentBody).toContain("secret=test-secret");
    expect(sentBody).toContain("response=a-real-looking-token");
  });

  it("returns false when hCaptcha reports failure", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "test-secret";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    }) as unknown as typeof fetch;

    const { verifyCaptcha } = await import("./hcaptcha");
    expect(await verifyCaptcha("bad-token")).toBe(false);
  });

  it("fails closed (not open) when the hCaptcha API itself errors", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "test-secret";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const { verifyCaptcha } = await import("./hcaptcha");
    expect(await verifyCaptcha("some-token")).toBe(false);
  });

  it("fails closed when hCaptcha responds with a non-OK status", async () => {
    process.env.HCAPTCHA_SECRET_KEY = "test-secret";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    const { verifyCaptcha } = await import("./hcaptcha");
    expect(await verifyCaptcha("some-token")).toBe(false);
  });

  it("fails open only when no secret is configured at all (e.g. local dev)", async () => {
    delete process.env.HCAPTCHA_SECRET_KEY;
    const { verifyCaptcha } = await import("./hcaptcha");
    expect(await verifyCaptcha("")).toBe(true);
  });
});
