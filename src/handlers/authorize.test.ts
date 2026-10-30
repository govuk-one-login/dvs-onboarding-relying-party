import { GetPublicKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { generateKeyPairSync } from "crypto";
import {
  randomNonce,
  randomState,
  randomPKCECodeVerifier,
  discovery,
  Configuration,
  ServerMetadata,
} from "openid-client";

let handler: typeof import("./authorize.js").handler;
const kmsMock = mockClient(KMS);
const rsaKey = generateKeyPairSync("rsa", {
  modulusLength: 4096,
}).publicKey;
const rsaKeyString = rsaKey.export({ type: "spki", format: "der" });
const keyAlias = "test-key-alias";

vi.mock("openid-client", async (importActual) => {
  const actual = await importActual<typeof import("openid-client")>();
  return {
    ...actual,
    randomNonce: vi.fn(),
    randomState: vi.fn(),
    randomPKCECodeVerifier: vi.fn(),
    discovery: vi.fn(),
  };
});

const mockedRandomNonce = vi.mocked(randomNonce);
const mockedRandomState = vi.mocked(randomState);
const mockedRandomPKCECodeVerifier = vi.mocked(randomPKCECodeVerifier);
const mockedDiscovery = vi.mocked(discovery);
const DATE_NOW = Date.UTC(2025, 1, 1, 12, 30);

describe("Authorize handler tests", () => {
  beforeEach(async () => {
    const baseUrl = "https://localhost:4400";
    const clientId = "test-client-id";
    process.env.OIDC_BASE_URL = baseUrl;
    process.env.CLIENT_ID = clientId;
    process.env.SIGNING_KEY_ALIAS = keyAlias;
    process.env.OIDC_AUTHORIZE_REDIRECT_URL = "https://localhost:5000/callback";
    handler = (await import("./authorize.js")).handler;
    kmsMock.reset();
    mockedRandomNonce.mockReturnValue("test-nonce");
    mockedRandomState.mockReturnValue("test-state");
    mockedRandomPKCECodeVerifier.mockReturnValue("test-code-verifier");
    const serverMetadata: ServerMetadata = {
      issuer: `${baseUrl}/authorize`,
      authorization_endpoint: `${baseUrl}/authorize`,
    };
    const config = new Configuration(serverMetadata, clientId);
    mockedDiscovery.mockResolvedValue(config);
    vi.useFakeTimers();
    vi.setSystemTime(DATE_NOW);
  });
  afterAll(() => {
    vi.resetAllMocks();
  });

  it("should return 200 with landing page when using method GET", async () => {
    const response = await handler(
      {
        httpMethod: "GET",
        path: "/authorize",
      },
      {} as any,
      () => {}
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Start journey");
  });

  it("should return 200 and send request to OneLogin when using method POST", async () => {
    kmsMock.on(GetPublicKeyCommand, { KeyId: keyAlias }).resolves({
      KeyId: keyAlias,
      PublicKey: new Uint8Array(rsaKeyString),
    });
    kmsMock.on(SignCommand).resolves({
      Signature: Buffer.from("test-signature"),
    });
    const response = await handler(
      {
        httpMethod: "POST",
        path: "/authorize",
      },
      {} as any,
      () => {}
    );

    expect(response.statusCode).toBe(302);
    expect(response.headers.Location).toEqual(
      "https://localhost:4400/authorize?request=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImUxYjEwYjMxY2JhNDgzNWI0YmNkZGZjZTNmNDUxY2ZmNTE1MzRlZWU2NThlNjAzZDk3MWVkYzRmODBiMzdlM2MifQ.eyJyZWRpcmVjdF91cmkiOiJodHRwczovL2xvY2FsaG9zdDo1MDAwL2NhbGxiYWNrIiwic2NvcGUiOiJvcGVuaWQgZW1haWwgcGhvbmUiLCJ2dHIiOiJbXCJQMi5DbC5DbVwiXSIsIm5vbmNlIjoidGVzdC1ub25jZSIsInN0YXRlIjoidGVzdC1zdGF0ZSIsImNvZGVfY2hhbGxlbmdlIjoiMEZMSUthaHJYN2txeG5jd2hWNVdEODJsdV93aTVHQThGc1JTTHViYU9wVSIsImNvZGVfY2hhbGxlbmdlX21ldGhvZCI6IlMyNTYiLCJpc3MiOiJ0ZXN0LWNsaWVudC1pZCIsImNsaWVudF9pZCI6InRlc3QtY2xpZW50LWlkIiwicmVzcG9uc2VfdHlwZSI6ImNvZGUiLCJ1aV9sb2NhbGVzIjoiZW4iLCJjbGFpbXMiOiJ7XCJ1c2VyaW5mb1wiOntcImh0dHBzOi8vdm9jYWIuYWNjb3VudC5nb3YudWsvdjEvY29yZUlkZW50aXR5SldUXCI6bnVsbH19IiwiYXVkIjoiaHR0cHM6Ly9sb2NhbGhvc3Q6NDQwMC9hdXRob3JpemUiLCJpYXQiOjE3Mzg0MTMwMDAsImV4cCI6MTczODQxMzMwMH0.dGVzdC1zaWduYXR1cmU&response_type=code&scope=openid+email+phone&client_id=test-client-id" // pragma: allowlist secret
    );
    const url = new URL(response.headers.Location);
    const requestObject = url.searchParams.get("request")!;
    const header = JSON.parse(
      Buffer.from(requestObject.split(".")[0], "base64url").toString()
    );
    const payload = JSON.parse(
      Buffer.from(requestObject.split(".")[1], "base64url").toString()
    );
    expect(header).toStrictEqual({
      alg: "RS256",
      kid: "e1b10b31cba4835b4bcddfce3f451cff51534eee658e603d971edc4f80b37e3c", // pragma: allowlist secret
      typ: "JWT",
    });
    expect(payload).toStrictEqual({
      aud: "https://localhost:4400/authorize",
      claims:
        '{"userinfo":{"https://vocab.account.gov.uk/v1/coreIdentityJWT":null}}',
      client_id: "test-client-id",
      code_challenge: "0FLIKahrX7kqxncwhV5WD82lu_wi5GA8FsRSLubaOpU", // pragma: allowlist secret
      code_challenge_method: "S256",
      exp: 1738413300,
      iat: 1738413000,
      iss: "test-client-id",
      nonce: "test-nonce",
      redirect_uri: "https://localhost:5000/callback",
      response_type: "code",
      scope: "openid email phone",
      state: "test-state",
      ui_locales: "en",
      vtr: '["P2.Cl.Cm"]',
    });
    expect(response.multiValueHeaders).toStrictEqual({
      "Set-Cookie": [
        "nonce=test-nonce; HttpOnly; Secure; Path=/; Max-Age=3600",
        "state=test-state; HttpOnly; Secure; Path=/; Max-Age=3600",
        "code_verifier=test-code-verifier; HttpOnly; Secure; Path=/; Max-Age=3600",
      ],
    });
  });

  it("should return 405 with method not supported when using invalid method", async () => {
    const result = await handler(
      {
        httpMethod: "DELETE",
        path: "/authorize",
      },
      {} as any,
      () => {}
    );

    expect(result.statusCode).toBe(405);
    expect(result.body).toStrictEqual("Method not allowed");
  });
});
