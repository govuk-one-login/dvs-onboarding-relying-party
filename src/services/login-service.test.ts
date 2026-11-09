import {
  GetSecretValueCommand,
  SecretsManager,
} from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";
import { getLoginCredentials } from "./login-service.js";

const secretsManagerMock = mockClient(SecretsManager);
const secretId = "test-secret-id"; // pragma: allowlist secret
const credentials = {
  username: "user",
  password: "secret", // pragma: allowlist secret
};

describe("Login service tests", () => {
  beforeEach(() => {
    process.env.LOGIN_SECRET_ID = secretId;
    secretsManagerMock.reset();
  });
  it("should cache secret from secrets manager", async () => {
    secretsManagerMock
      .on(GetSecretValueCommand, { SecretId: secretId })
      .resolves({ SecretString: JSON.stringify(credentials) });

    await getLoginCredentials();
    const actualCredentials = await getLoginCredentials(); // Call twice to check caching code

    expect(actualCredentials).toStrictEqual(credentials);
    expect(secretsManagerMock.calls()).toHaveLength(1);
  });
});
