import {
  randomNonce,
  randomState,
  randomPKCECodeVerifier,
  discovery,
  Configuration,
  ServerMetadata,
} from "openid-client";
import { buildRequestObjectWithKms } from "../services/authorize-service.js";

let handler: typeof import("./authorize.js").handler;

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

vi.mock("./../services/authorize-service.ts", () => {
  return {
    buildRequestObjectWithKms: vi.fn(),
  };
});

const mockedRandomNonce = vi.mocked(randomNonce);
const mockedRandomState = vi.mocked(randomState);
const mockedRandomPKCECodeVerifier = vi.mocked(randomPKCECodeVerifier);
const mockedDiscovery = vi.mocked(discovery);
const mockedBuildRequestObject = vi.mocked(buildRequestObjectWithKms);

describe("Authorize handler tests", () => {
  beforeEach(async () => {
    const baseUrl = "https://localhost:4400";
    const clientId = "test-client-id";
    process.env.OIDC_BASE_URL = baseUrl;
    process.env.CLIENT_ID = clientId;
    process.env.OIDC_AUTHORIZE_REDIRECT_URL = "https://localhost:5000/callback";
    handler = (await import("./authorize.js")).handler;
    mockedRandomNonce.mockReturnValue("test-nonce");
    mockedRandomState.mockReturnValue("test-state");
    mockedRandomPKCECodeVerifier.mockReturnValue("test-code-verifier");
    const serverMetadata: ServerMetadata = {
      issuer: `${baseUrl}/authorize`,
      authorization_endpoint: `${baseUrl}/authorize`,
    };
    const config = new Configuration(serverMetadata, clientId);
    mockedDiscovery.mockResolvedValue(config);
  });
  afterEach(() => {
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
    expect(response.body).toContain("Start now");
  });

  it("should return 200 and send request to OneLogin when using method POST", async () => {
    mockedBuildRequestObject.mockResolvedValue("test-request-object");
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
      "https://localhost:4400/authorize?request=test-request-object&response_type=code&scope=openid+email+phone&client_id=test-client-id" // pragma: allowlist secret
    );
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
