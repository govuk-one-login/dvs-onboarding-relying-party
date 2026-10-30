import { getKeyFromKms } from "../services/jwks-service.js";

vi.mock("../services/jwks-service.js", () => ({
  getKeyFromKms: vi.fn(),
}));

const mockedGetKeyFromKms = vi.mocked(getKeyFromKms);

const alias = "test-key-alias";
const fakeJwk = { kty: "RSA", alg: "RS256", kid: "abc123" };
let handler: typeof import("./jwks.js").handler;

describe("JWKS handler tests", () => {
  beforeEach(async () => {
    handler = (await import("./jwks.js")).handler;
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SIGNING_KEY_ALIAS = alias;
  });

  it("should return 200 with JWKS when service retrieves JWK successfully", async () => {
    mockedGetKeyFromKms.mockResolvedValue(fakeJwk);

    const result = await handler({}, {} as never, () => {});

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toStrictEqual({ keys: [fakeJwk] });
    expect(mockedGetKeyFromKms).toHaveBeenCalledExactlyOnceWith(alias);
  });

  it("should return 500 when service fails to return JWK", async () => {
    mockedGetKeyFromKms.mockThrow(new Error("Key not found"));

    const result = await handler({}, {} as never, () => {});

    expect(result.statusCode).toBe(500);
    expect(result.body).toStrictEqual("Internal server error");
    expect(mockedGetKeyFromKms).toHaveBeenCalledExactlyOnceWith(alias);
  });

  it("should use cached JWK after first invocation", async () => {
    mockedGetKeyFromKms.mockResolvedValue(fakeJwk);

    // Invoke handler twice
    await handler({}, {} as never, () => {});
    const result = await handler({}, {} as never, () => {});

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toStrictEqual({ keys: [fakeJwk] });
    expect(mockedGetKeyFromKms).toHaveBeenCalledExactlyOnceWith(alias);
  });
});
