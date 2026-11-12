import {
  discovery,
  Configuration,
  ServerMetadata,
  fetchUserInfo,
  TokenEndpointResponseHelpers,
} from "openid-client";
import * as oauth from "oauth4webapi";
import { makeTokenRequest } from "../services/callback-service.js";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { saveResult } from "../services/result-service.js";

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

vi.mock("./../services/result-service.ts", () => {
  return {
    saveResult: vi.fn(),
  };
});

const mockedDiscovery = vi.mocked(discovery);
const mockedMakeTokenRequest = vi.mocked(makeTokenRequest);
const mockedFetchUserInfo = vi.mocked(fetchUserInfo);
const mockedSaveResult = vi.mocked(saveResult);
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
  sub: "test-subject",
} as oauth.UserInfoResponse;

describe("Callback handler tests", () => {
  beforeEach(async () => {
    const baseUrl = "https://localhost:4400";
    const clientId = "test-client-id";
    vi.stubEnv("DVS_BASE_URL", "https://localhost:5000");
    process.env.OIDC_BASE_URL = baseUrl;
    process.env.DVS_BASE_URL = "https://localhost:5000";
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
        cookie: "state=test-state; gs=test-session-id.test-client-session-id",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(`Success!`);
    expect(mockedSaveResult).toHaveBeenCalledExactlyOnceWith({
      referenceId: "z5DJHFm0YdxzeH03qoAdfkoWfmMaITiyNoGCh92XIuc=", //pragma: allowlist secret
      subjectId: "test-subject",
      email: "test@email.com",
      name: "Test User",
      dob: "1970-01-01",
    });
  });

  it("should return 400 if error is returned from OneLogin", async () => {
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state; gs=test-session-id.test-client-session-id",
      },
      queryStringParameters: {
        state: "test-state",
        error: "test-error-code",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(
      "Sorry, there is a problem with the service"
    );
    expect(mockedSaveResult).not.toHaveBeenCalled();
  });

  it("should return 400 if state in cookies does not match state in query parameters", async () => {
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state gs=test-session-id.test-client-session-id",
      },
      queryStringParameters: {
        state: "invalid-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(
      `Sorry, there is a problem with the service`
    );
    expect(mockedSaveResult).not.toHaveBeenCalled();
  });

  it("should return 400 if error is thrown when making token request", async () => {
    mockedMakeTokenRequest.mockThrow(
      new Error("Timed out making token request")
    );
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state gs=test-session-id.test-client-session-id",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(
      "Sorry, there is a problem with the service"
    );
  });

  it("should return 400 if subject not present in token response", async () => {
    mockedMakeTokenRequest.mockResolvedValue({
      claims: () => ({}),
    } as oauth.TokenEndpointResponse & TokenEndpointResponseHelpers);
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state gs=test-session-id.test-client-session-id",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(
      "Sorry, there is a problem with the service"
    );
    expect(mockedSaveResult).not.toHaveBeenCalled();
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
        cookie: "state=test-state gs=test-session-id.test-client-session-id",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(
      "Sorry, there is a problem with the service"
    );
    expect(mockedSaveResult).not.toHaveBeenCalled();
  });

  it("should return 400 if no session cookie is present in request", async () => {
    mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
    mockedFetchUserInfo.mockResolvedValue(validUserInfo);
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(
      "Sorry, there is a problem with the service"
    );
  });

  it("should return 400 if session cookie does not contain client session ID in request", async () => {
    mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
    mockedFetchUserInfo.mockResolvedValue(validUserInfo);
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state;gs=test-session-id",
      },
      queryStringParameters: {
        state: "test-state",
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, {} as Context, () => {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(
      "Sorry, there is a problem with the service"
    );
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
    expect(mockedSaveResult).not.toHaveBeenCalled();
  });
});
