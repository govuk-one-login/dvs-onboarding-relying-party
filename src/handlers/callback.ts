import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import {
  discovery,
  fetchUserInfo,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
  UserInfoResponse,
} from "openid-client";
import { clientConfiguration } from "../config.js";
import { parseCookies, renderResponse } from "../utils.js";
import { logger } from "../logger.js";
import { makeTokenRequest } from "../services/callback-service.js";

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "GET") {
    try {
      return get(event);
    } catch (e) {
      logger.error(`Error while calling GET: ${(e as Error).message}`);
      return renderResponse(500, "Internal server error");
    }
  }
  return renderResponse(405, "Method not allowed");
};

const get = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const cookies = parseCookies(event);
  const state = cookies["state"];
  const nonce = cookies["nonce"];
  const codeVerifier = cookies["code_verifier"];

  const stateFromRequest = event.queryStringParameters?.state;
  if (!state || state !== stateFromRequest) {
    return renderResponse(400, "invalid state");
  }

  const oidcConfig = await discovery(
    new URL(`${process.env.OIDC_BASE_URL}`),
    clientConfiguration.clientId
  );

  logger.info("Calling token endpoint");
  let tokenResponse: TokenEndpointResponse & TokenEndpointResponseHelpers;
  try {
    tokenResponse = await makeTokenRequest(
      oidcConfig,
      event,
      state,
      nonce,
      codeVerifier
    );
  } catch (e) {
    logger.error(`Failed to make token request: ${(e as Error).message}`);
    return renderResponse(400, "Bad request");
  }

  const claims = tokenResponse?.claims();
  if (!claims?.sub) {
    logger.error("Subject not present in token response");
    return renderResponse(400, "Bad request");
  }

  logger.info("Calling userinfo endpoint");
  let userInfo: UserInfoResponse;
  try {
    userInfo = await fetchUserInfo(
      oidcConfig,
      tokenResponse.access_token,
      claims.sub
    );
  } catch (e) {
    logger.error(`Failed to fetch user info: ${(e as Error).message}`);
    return renderResponse(400, "Bad request");
  }

  logger.info("Success");
  return renderResponse(200, `success: ${JSON.stringify(userInfo)}`);
};
