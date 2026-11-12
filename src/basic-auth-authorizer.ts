import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
  Handler,
} from "aws-lambda";
import { timingSafeEqual } from "crypto";
import { logger } from "./logger.js";
import { getLoginCredentials } from "./services/login-service.js";

export const handler: Handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const credentials = parseBasicAuthHeader(event);

  if (!credentials) {
    logger.warn("Missing or malformed Authorization header");
    throw new Error("Unauthorized");
  }
  try {
    const expected = await getLoginCredentials();

    const authorized =
      safeEqual(credentials.username, expected.username) &&
      safeEqual(credentials.password, expected.password);

    if (!authorized) {
      logger.warn("Invalid credentials supplied to basic auth authorizer");
      return buildDenyPolicy(credentials.username, event.methodArn);
    }

    return buildAllowPolicy(credentials.username, event.methodArn);
  } catch (e) {
    logger.error(`Failed to check credentials: ${(e as Error).message}`);
    throw new Error("Unauthorized", { cause: e });
  }
};

const parseBasicAuthHeader = (
  event: APIGatewayRequestAuthorizerEvent
): { username: string; password: string } | undefined => {
  const authorizationHeader =
    event.headers?.Authorization ?? event.headers?.authorization;

  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, encodedCreds] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encodedCreds) {
    return undefined;
  }

  const decoded = Buffer.from(encodedCreds, "base64").toString("utf8");
  const creds = decoded.split(":");
  if (creds.length !== 2) {
    return undefined;
  }

  return {
    username: creds[0],
    password: creds[1],
  };
};

const safeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
};

const buildAllowPolicy = (
  principalId: string,
  resource: string
): APIGatewayAuthorizerResult => buildPolicy(principalId, "Allow", resource);
const buildDenyPolicy = (
  principalId: string,
  resource: string
): APIGatewayAuthorizerResult => buildPolicy(principalId, "Deny", resource);
const buildPolicy = (
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string
): APIGatewayAuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});
