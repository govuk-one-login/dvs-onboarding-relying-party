import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import {
  buildAuthorizationUrl,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from "openid-client";
import { clientConfiguration } from "../config.js";
import { buildRequestObjectWithKms } from "../services/authorize-service.js";
import startPage from "../pages/start.html";

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "GET") {
    return get();
  }
  if (event.httpMethod === "POST") {
    return await post();
  }
  return renderResponse(405, "Method not allowed");
};

const get = (): APIGatewayProxyResult => {
  return renderResponse(200, startPage);
};

const post = async (): Promise<APIGatewayProxyResult> => {
  const oidcConfig = await discovery(
    new URL(`${process.env.OIDC_BASE_URL}`),
    clientConfiguration.clientId
  );
  const nonce = randomNonce();
  const state = randomState();
  const codeVerifier = randomPKCECodeVerifier();
  const cookies: Record<string, string> = {
    nonce,
    state,
    code_verifier: codeVerifier,
  };

  const request = await buildRequestObjectWithKms(
    process.env.SIGNING_KEY_ALIAS!,
    nonce,
    state,
    codeVerifier,
    oidcConfig.serverMetadata().authorization_endpoint!
  );
  const authorizeUrl = buildAuthorizationUrl(oidcConfig, {
    request,
    response_type: "code",
    scope: clientConfiguration.scopes.join(" "),
  });
  return {
    statusCode: 302,
    headers: {
      Location: authorizeUrl.toString(),
    },
    multiValueHeaders: {
      "Set-Cookie": Object.entries(cookies).map(
        (entry) =>
          `${entry[0]}=${entry[1]}; HttpOnly; Secure; Path=/; Max-Age=3600`
      ),
    },
    body: "",
  };
};

const renderResponse = (
  statusCode: number,
  html: string
): APIGatewayProxyResult => {
  return {
    statusCode,
    body: html,
    headers: {
      "Content-Type": "text/html",
    },
  };
};
