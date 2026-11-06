import {
  GetSecretValueCommand,
  SecretsManager,
} from "@aws-sdk/client-secrets-manager";

export interface LoginCredentials {
  username: string;
  password: string;
}

const username = "user";
const secretsManagerClient = new SecretsManager({
  region: "eu-west-2",
});

let cachedCredentials: LoginCredentials | undefined;

export const getLoginCredentials = async (
  secretId: string
): Promise<LoginCredentials> => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const { SecretString } = await secretsManagerClient.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  if (!SecretString) {
    throw new Error("Login secret has no value");
  }

  cachedCredentials = { username, password: SecretString };
  return cachedCredentials;
};
