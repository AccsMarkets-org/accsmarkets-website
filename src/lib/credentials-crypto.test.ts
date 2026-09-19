import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("credentials-crypto", () => {
  const originalKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

  beforeAll(() => {
    // A valid, fixed test key so this suite doesn't depend on .env being
    // loaded (vitest doesn't run through Next's env loader).
    process.env.CREDENTIALS_ENCRYPTION_KEY = "a".repeat(64);
  });

  afterAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = originalKey;
  });

  it("round-trips plaintext through encrypt/decrypt", async () => {
    const { encryptCredentials, decryptCredentials } = await import("./credentials-crypto");
    const plaintext = "username: seller123\npassword: hunter2\nrecovery email: seller@example.com";
    const encrypted = encryptCredentials(plaintext);
    expect(encrypted).not.toContain("hunter2");
    expect(decryptCredentials(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptCredentials } = await import("./credentials-crypto");
    const a = encryptCredentials("same secret");
    const b = encryptCredentials("same secret");
    expect(a).not.toBe(b);
  });

  it("stores as iv:authTag:ciphertext hex triples", async () => {
    const { encryptCredentials } = await import("./credentials-crypto");
    const parts = encryptCredentials("x").split(":");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("throws on a malformed payload", async () => {
    const { decryptCredentials } = await import("./credentials-crypto");
    expect(() => decryptCredentials("not-a-valid-payload")).toThrow();
  });

  it("throws if the auth tag doesn't match (tampered ciphertext)", async () => {
    const { encryptCredentials, decryptCredentials } = await import("./credentials-crypto");
    const encrypted = encryptCredentials("secret data");
    const [iv, authTag, data] = encrypted.split(":");
    const tampered = `${iv}:${authTag}:${data.slice(0, -2)}ff`;
    expect(() => decryptCredentials(tampered)).toThrow();
  });

  it("requires exactly a 64-hex-char (32-byte) key", async () => {
    // Regression test for the Phase 0.6 investigation: getKey() must reject
    // any key that isn't exactly 64 hex characters, since a silently-accepted
    // wrong-length key would mean encrypt/decrypt use inconsistent keys.
    // getKey() re-reads process.env on every call rather than caching it at
    // module-load time, so mutating the env var here takes effect immediately
    // without needing to re-import the module.
    const { encryptCredentials } = await import("./credentials-crypto");
    process.env.CREDENTIALS_ENCRYPTION_KEY = "a".repeat(66); // too long
    expect(() => encryptCredentials("x")).toThrow(/32-byte hex string/);
    process.env.CREDENTIALS_ENCRYPTION_KEY = "a".repeat(64); // restore valid
  });
});
