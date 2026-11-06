import {
  GetSecretValueCommand,
  SecretsManager,
} from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";
import { APIGatewayRequestAuthorizerEvent } from "aws-lambda";

let handler: typeof import("./basic-auth-authorizer.js").handler;

const secretsManagerMock = mockClient(SecretsManager);

const secretId = "test-login-secret"; // pragma: allowlist secret
const methodArn =
  "arn:aws:execute-api:eu-west-2:123456789012:abc123/dev/GET/authorize";

const encode = (username: string, password: string): string =>
  `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

const buildEvent = (
  authorizationHeader?: string
): APIGatewayRequestAuthorizerEvent =>
  ({
    type: "REQUEST",
    methodArn,
    headers: authorizationHeader ? { Authorization: authorizationHeader } : {},
  }) as unknown as APIGatewayRequestAuthorizerEvent;

describe("Basic auth authorizer tests", () => {
  beforeEach(async () => {
    process.env.LOGIN_SECRET_ID = secretId;
    secretsManagerMock.reset();
    secretsManagerMock
      .on(GetSecretValueCommand, { SecretId: secretId })
      .resolves({
        SecretString: "secret", // pragma: allowlist secret
      });
    handler = (await import("./basic-auth-authorizer.js")).handler;
  });
  afterEach(() => {
    vi.resetModules();
  });

  it("should return an Allow policy when credentials are valid", async () => {
    const result = await handler(
      buildEvent(encode("user", "secret")),
      {} as any,
      () => {}
    );

    expect(result.principalId).toBe("user");
    expect(result.policyDocument.Statement[0]).toStrictEqual({
      Action: "execute-api:Invoke",
      Effect: "Allow",
      Resource: methodArn,
    });
  });

  it("should throw Unauthorized when the password is wrong", async () => {
    await expect(
      handler(buildEvent(encode("user", "wrong")), {} as any, () => {})
    ).rejects.toThrow("Unauthorized");
  });

  it("should throw Unauthorized when the username is wrong", async () => {
    await expect(
      handler(buildEvent(encode("intruder", "secret")), {} as any, () => {})
    ).rejects.toThrow("Unauthorized");
  });

  it("should throw Unauthorized when the Authorization header is missing", async () => {
    await expect(handler(buildEvent(), {} as any, () => {})).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("should throw Unauthorized when the scheme is not Basic", async () => {
    await expect(
      handler(buildEvent("Bearer sometoken"), {} as any, () => {})
    ).rejects.toThrow("Unauthorized");
  });
});
