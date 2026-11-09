import {
  GetSecretValueCommand,
  SecretsManager,
} from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";

let handler: typeof import("./basic-auth-authorizer.js").handler;

const secretsManagerMock = mockClient(SecretsManager);

const secretId = "test-login-secret"; // pragma: allowlist secret
const methodArn =
  "arn:aws:execute-api:eu-west-2:123456789012:abc123/dev/GET/authorize";

const encodeBasicAuth = (username: string, password: string): string =>
  `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

describe("Basic auth authorizer tests", () => {
  beforeEach(async () => {
    process.env.LOGIN_SECRET_ID = secretId;
    secretsManagerMock.reset();
    secretsManagerMock
      .on(GetSecretValueCommand, { SecretId: secretId })
      .resolves({
        SecretString: '{"username":"user", "password":"secret"}', // pragma: allowlist secret
      });
    handler = (await import("./basic-auth-authorizer.js")).handler;
  });
  afterEach(() => {
    vi.resetModules();
  });

  it("should return an Allow policy when credentials are valid", async () => {
    const request = {
      type: "REQUEST",
      methodArn,
      headers: { Authorization: encodeBasicAuth("user", "secret") },
    };

    const result = await handler(request, {} as any, () => {});

    expect(result.principalId).toBe("user");
    expect(result.policyDocument.Statement[0]).toStrictEqual({
      Action: "execute-api:Invoke",
      Effect: "Allow",
      Resource: methodArn,
    });
  });

  it("should return a Deny policy when the password is wrong", async () => {
    const request = {
      type: "REQUEST",
      methodArn,
      headers: { Authorization: encodeBasicAuth("user", "wrong") },
    };

    const result = await handler(request, {} as any, () => {});

    expect(result.principalId).toBe("user");
    expect(result.policyDocument.Statement[0]).toStrictEqual({
      Action: "execute-api:Invoke",
      Effect: "Deny",
      Resource: methodArn,
    });
  });

  it("should return a Deny policy when the username is wrong", async () => {
    const request = {
      type: "REQUEST",
      methodArn,
      headers: { Authorization: encodeBasicAuth("intruder", "secret") },
    };

    const result = await handler(request, {} as any, () => {});

    expect(result.principalId).toBe("intruder");
    expect(result.policyDocument.Statement[0]).toStrictEqual({
      Action: "execute-api:Invoke",
      Effect: "Deny",
      Resource: methodArn,
    });
  });

  it("should throw Unauthorized when the Authorization header is missing", async () => {
    const request = {
      type: "REQUEST",
      methodArn,
    };

    await expect(handler(request, {} as any, () => {})).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("should throw Unauthorized when the scheme is not Basic", async () => {
    const request = {
      type: "REQUEST",
      methodArn,
      headers: { Authorization: "Bearer sometoken" },
    };

    await expect(handler(request, {} as any, () => {})).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("should throw Unauthorized when login secret is not defined", async () => {
    delete process.env.LOGIN_SECRET_ID;
    const request = {
      type: "REQUEST",
      methodArn,
      headers: { Authorization: encodeBasicAuth("user", "secret") },
    };

    await expect(handler(request, {} as any, () => {})).rejects.toThrow(
      new Error("Unauthorized", { cause: new Error("Invalid configuration") })
    );
  });
});
