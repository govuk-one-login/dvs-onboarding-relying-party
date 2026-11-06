import {
  randomNonce,
  randomState,
  randomPKCECodeVerifier,
  discovery,
  Configuration,
  ServerMetadata,
  fetchUserInfo,
  IDToken,
  TokenEndpointResponseHelpers,
} from "openid-client";
import * as oauth from "oauth4webapi";
import { buildRequestObjectWithKms } from "../services/authorize-service.js";
import { makeTokenRequest } from "../services/callback-service.js";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

let handler: typeof import("./callback.js").handler;

vi.mock("openid-client", async (importActual) => {
  const actual = await importActual<typeof import("openid-client")>();
  return {
    ...actual,
    fetchUserInfo: vi.fn(),
    discovery: vi.fn(),
  };
});

vi.mock("./../services/callback-service.ts", () => {
  return {
    makeTokenRequest: vi.fn(),
  };
});
const mockedDiscovery = vi.mocked(discovery);
const mockedMakeTokenRequest = vi.mocked(makeTokenRequest);
const mockedFetchUserInfo = vi.mocked(fetchUserInfo);
const validTokenResponse = {
  access_token: "test-access-token",
  token_type: "bearer",
  claims: () => ({
    iss: "test-issuer",
    sub: "test-subject",
    aud: "test-aud",
    iat: 12345670,
    exp: 12345678,
  }),
  expiresIn: () => 12345678,
} as oauth.TokenEndpointResponse & TokenEndpointResponseHelpers;
const validUserInfo = {
  email: "test@email.com",
  name: "Test Person",
} as oauth.UserInfoResponse;

describe("Authorize handler tests", () => {
  beforeEach(async () => {
    const baseUrl = "https://localhost:4400";
    const clientId = "test-client-id";
    process.env.OIDC_BASE_URL = baseUrl;
    process.env.CLIENT_ID = clientId;
    handler = (await import("./callback.js")).handler;
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

  it("should return 200 with valid user info when token and user info are valid", async () => {
    mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
    mockedFetchUserInfo.mockResolvedValue(validUserInfo);
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        host: "localhost:1234",
        cookie: "state=test-state",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual(
      `success: ${JSON.stringify(validUserInfo)}`
    );
  });

  it("should return 400 if state in cookies does not match state in query parameters", async () => {
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        host: "localhost:1234",
        cookie: "state=test-state",
      },
      queryStringParameters: {
        state: "invalid-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toStrictEqual(`invalid state`);
  });

  it("should return 400 if error is thrown when making token request", async () => {
    mockedMakeTokenRequest.mockThrow(
      new Error("Timed out making token request")
    );
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        host: "localhost:1234",
        cookie: "state=test-state",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toStrictEqual("Bad request");
  });

  it("should return 400 if subject not present in token response", async () => {
    mockedMakeTokenRequest.mockResolvedValue({
      claims: () => ({}),
    } as oauth.TokenEndpointResponse & TokenEndpointResponseHelpers);
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        host: "localhost:1234",
        cookie: "state=test-state",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toStrictEqual("Bad request");
  });

  it("should return 400 if error is thrown when making user info request", async () => {
    mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
    mockedFetchUserInfo.mockThrow(
      new Error("Timed out making user info request")
    );
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        host: "localhost:1234",
        cookie: "state=test-state",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toStrictEqual("Bad request");
  });

  it("should return 405 with method not supported when using invalid method", async () => {
    const response = await handler(
      {
        httpMethod: "DELETE",
        path: "/callback",
      },
      {} as Context,
      () => {}
    );

    expect(response.statusCode).toBe(405);
    expect(response.body).toStrictEqual("Method not allowed");
  });
});
