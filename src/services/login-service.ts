import {
  GetSecretValueCommand,
  SecretsManager,
} from "@aws-sdk/client-secrets-manager";
import { getLoginSecretId } from "../config.js";

export interface LoginCredentials {
  username: string;
  password: string;
}

const secretsManagerClient = new SecretsManager({
  region: "eu-west-2",
});

let cachedCredentials: LoginCredentials | undefined;

export const getLoginCredentials = async (): Promise<LoginCredentials> => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const { SecretString } = await secretsManagerClient.send(
    new GetSecretValueCommand({ SecretId: getLoginSecretId() })
  );

  if (!SecretString) {
    throw new Error("Login secret has no value");
  }
  const credentials = JSON.parse(SecretString);

  cachedCredentials = {
    username: credentials.username,
    password: credentials.password,
  };
  return cachedCredentials;
};
