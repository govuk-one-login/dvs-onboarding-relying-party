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
import { getClientConfiguration } from "../config.js";
import { parseCookies, renderResponse } from "../utils.js";
import { logger } from "../logger.js";
import { makeTokenRequest } from "../services/callback-service.js";
import { createPage, errorPage } from "../pages/utils.js";
import { createHash } from "crypto";
import { saveResult } from "../services/result-service.js";

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "GET") {
    try {
      return get(event);
    } catch (e) {
      logger.error(`Error while calling GET: ${(e as Error).message}`);
      return renderResponse(500, errorPage);
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

  const error = event.queryStringParameters?.error;
  if (error) {
    logger.error(`Error from OneLogin: ${error}`);
    return renderResponse(400, errorPage);
  }

  const stateFromRequest = event.queryStringParameters?.state;
  logger.info("Checking state against state in cookie");
  if (!state || state !== stateFromRequest) {
    return renderResponse(400, errorPage);
  }

  logger.info("Calling discovery endpoint");
  const oidcConfig = await discovery(
    new URL(`${process.env.OIDC_BASE_URL}`),
    getClientConfiguration().clientId
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
    return renderResponse(400, errorPage);
  }

  const claims = tokenResponse?.claims();
  if (!claims?.sub) {
    logger.error("Subject not present in token response");
    return renderResponse(400, errorPage);
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
    return renderResponse(400, errorPage);
  }

  logger.info("Success");
  const clientSessionId = cookies["gs"].split(".")[1];
  const referenceId = createHash("sha256")
    .update(clientSessionId, "utf8")
    .digest("base64");
  logger.info(
    `Generated referenceId ${referenceId} from clientSessionId ${clientSessionId}`
  );
  logger.info(`User info: ${JSON.stringify(userInfo)}`);

  if (!userInfo.email) {
    logger.info("Missing email in userInfo");
    return renderResponse(400, errorPage);
  }
  if (!userInfo.name) {
    logger.info("Missing name in userInfo");
    return renderResponse(400, errorPage);
  }
  if (!userInfo.birthdate) {
    logger.info("Missing birthdate in userInfo");
    return renderResponse(400, errorPage);
  }

  await saveResult({
    referenceId,
    subjectId: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    dob: userInfo.birthdate,
  });

  return renderResponse(
    200,
    createPage(
      `<p class="govuk-body">Success! Reference ID: ${referenceId}</p>`
    )
  );
};
