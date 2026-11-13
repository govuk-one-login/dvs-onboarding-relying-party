import { authorizationCodeGrant, Configuration } from "openid-client";
import { makeTokenRequest } from "./callback-service.js";
import { APIGatewayProxyEvent } from "aws-lambda";

vi.mock("openid-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("openid-client")>()),
  authorizationCodeGrant: vi.fn(),
}));

vi.mock("./kms-jwt-service.js", () => ({
  signJwtWithKms: vi.fn(),
}));

const { signJwtWithKms } = await import("./kms-jwt-service.js");

const clientId = "test-client-id";
const baseUrl = "https://localhost:4400";
const serverMetadata = {
  issuer: baseUrl,
  authorization_endpoint: `${baseUrl}/authorize`,
};
const config = new Configuration(serverMetadata, clientId);
const state = "test-state";
const nonce = "test-nonce";
const codeVerifier = "test-code-verifier";
const clientAssertion = "test-signed-jwt";

const mockedAuthCodeGrant = vi.mocked(authorizationCodeGrant);
const mockedSignJwtWithKms = vi.mocked(signJwtWithKms);

describe("Callback service tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OIDC_BASE_URL = "https://localhost:4400";
    process.env.DVS_BASE_URL = "https://localhost:5000";
    mockedSignJwtWithKms.mockResolvedValue(clientAssertion);
  });

  it("should send a token request with valid parameters", async () => {
    const event = {
      headers: {
        host: "localhost:1234",
      },
      path: "/callback",
    } as unknown as APIGatewayProxyEvent;

    await makeTokenRequest(config, event, state, nonce, codeVerifier);

    expect(mockedAuthCodeGrant).toHaveBeenCalledWith(
      config,
      new URL("https://localhost:5000/callback"),
      {
        expectedState: state,
        expectedNonce: nonce,
        pkceCodeVerifier: codeVerifier,
      },
      {
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: clientAssertion,
      }
    );
  });
});
