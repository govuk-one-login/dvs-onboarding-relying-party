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

  const expected = await getLoginCredentials(process.env.LOGIN_SECRET_ID!);

  const authorized =
    safeEqual(credentials.username, expected.username) &&
    safeEqual(credentials.password, expected.password);

  if (!authorized) {
    logger.warn("Invalid credentials supplied to basic auth authorizer");
    throw new Error("Unauthorized");
  }

  return buildPolicy(credentials.username, "Allow", event.methodArn);
};

const parseBasicAuthHeader = (
  event: APIGatewayRequestAuthorizerEvent
): { username: string; password: string } | undefined => {
  const headers = event.headers ?? {};
  const authorizationHeader = headers.Authorization ?? headers.authorization;

  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, encodedCreds] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encodedCreds) {
    return undefined;
  }

  const decoded = Buffer.from(encodedCreds, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return undefined;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
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
