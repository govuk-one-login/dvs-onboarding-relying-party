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

vi.mock("./../services/core-identity-service.ts", () => {
  return {
    verifyCoreIdentity: vi.fn(),
  };
});

vi.mock("./../services/result-service.ts", () => {
  return {
    saveResult: vi.fn(),
  };
});

const { verifyCoreIdentity } =
  await import("../services/core-identity-service.js");
const mockedDiscovery = vi.mocked(discovery);
const mockedMakeTokenRequest = vi.mocked(makeTokenRequest);
const mockedFetchUserInfo = vi.mocked(fetchUserInfo);
const mockedVerifyCoreIdentity = vi.mocked(verifyCoreIdentity);
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
    sid: "test-client-session-id",
  }),
  expiresIn: () => 12345678,
} as unknown as oauth.TokenEndpointResponse & TokenEndpointResponseHelpers;
const validUserInfo = {
  sub: "test-subject",
  email: "test@email.com",
  "https://vocab.account.gov.uk/v1/coreIdentityJWT": "test-core-identity-jwt",
} as oauth.UserInfoResponse;
const validCoreIdentity = {
  name: "Alice Jane Laura Doe",
  dob: "1970-01-01",
};

describe("Callback handler tests", () => {
  beforeEach(async () => {
    const baseUrl = "https://localhost:4400";
    const clientId = "test-client-id";
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

  it("should return 400 if error is returned from OneLogin", async () => {
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state",
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
  });

  it("should return 400 if state in cookies does not match state in query parameters", async () => {
    const event = {
      httpMethod: "GET",
      path: "/callback",
      headers: {
        cookie: "state=test-state",
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
  });

  it("should return 400 if error is thrown when making token request", async () => {
    mockedMakeTokenRequest.mockThrow(
      new Error("Timed out making token request")
    );
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

  it("should return 400 if subject not present in token response", async () => {
    mockedMakeTokenRequest.mockResolvedValue({
      claims: () =>
        ({ sid: "test-client-session-id" }) as Record<string, oauth.JsonValue>,
    } as oauth.TokenEndpointResponse & TokenEndpointResponseHelpers);
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

  it("should return 400 if client session ID not present in token response", async () => {
    mockedMakeTokenRequest.mockResolvedValue({
      claims: () =>
        ({ sub: "test-subject" }) as Record<string, oauth.JsonValue>,
    } as oauth.TokenEndpointResponse & TokenEndpointResponseHelpers);
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

  it("should return 400 if error is thrown when making user info request", async () => {
    mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
    mockedFetchUserInfo.mockThrow(
      new Error("Timed out making user info request")
    );
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
    expect(mockedSaveResult).not.toHaveBeenCalled();
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

  it.each(["local", "dev", "build"])(
    "should return 200 with valid user info when token and user info are valid in %s environment",
    async () => {
      process.env.ENVRIONMENT = "dev";
      mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
      mockedFetchUserInfo.mockResolvedValue(validUserInfo);
      mockedVerifyCoreIdentity.mockResolvedValue(validCoreIdentity);
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

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain(`Success!`);
      expect(mockedVerifyCoreIdentity).not.toHaveBeenCalled();
      expect(mockedSaveResult).toHaveBeenCalledExactlyOnceWith({
        referenceId: "z5DJHFm0YdxzeH03qoAdfkoWfmMaITiyNoGCh92XIuc=", //pragma: allowlist secret
        subjectId: "test-subject",
        email: "test@email.com",
        name: "Test User",
        dob: "1970-01-01",
      });
    }
  );

  describe("CoreIdentityJWT validation in non-stubbed environments", () => {
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
    it.each(["staging", "integration", "production"])(
      "should return 200 with valid user info when token and user info are valid in %s environment",
      async (env) => {
        process.env.ENVIRONMENT = env;
        mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
        mockedFetchUserInfo.mockResolvedValue(validUserInfo);
        mockedVerifyCoreIdentity.mockResolvedValue(validCoreIdentity);

        const response = await handler(event, {} as Context, () => {});

        expect(response.statusCode).toBe(200);
        expect(response.body).toContain(`Success!`);
        expect(mockedVerifyCoreIdentity).toHaveBeenCalledWith(
          "test-core-identity-jwt",
          "test-subject",
          "test-client-id"
        );
        expect(mockedSaveResult).toHaveBeenCalledExactlyOnceWith({
          referenceId: "z5DJHFm0YdxzeH03qoAdfkoWfmMaITiyNoGCh92XIuc=", //pragma: allowlist secret
          subjectId: "test-subject",
          email: "test@email.com",
          name: "Alice Jane Laura Doe",
          dob: "1970-01-01",
        });
      }
    );

    it("should return 400 if coreIdentityJWT is missing from userInfo", async () => {
      process.env.ENVIRONMENT = "production";
      mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
      mockedFetchUserInfo.mockResolvedValue({
        sub: "test-subject",
        email: "test@email.com",
      } as oauth.UserInfoResponse);

      const response = await handler(event, {} as Context, () => {});

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain(
        "Sorry, there is a problem with the service"
      );
      expect(mockedVerifyCoreIdentity).not.toHaveBeenCalled();
    });

    it("should return 400 if core identity verification fails", async () => {
      process.env.ENVIRONMENT = "production";
      mockedMakeTokenRequest.mockResolvedValue(validTokenResponse);
      mockedFetchUserInfo.mockResolvedValue(validUserInfo);
      mockedVerifyCoreIdentity.mockRejectedValue(
        new Error("Invalid core identity signature")
      );

      const response = await handler(event, {} as Context, () => {});

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain(
        "Sorry, there is a problem with the service"
      );
    });
  });
});
