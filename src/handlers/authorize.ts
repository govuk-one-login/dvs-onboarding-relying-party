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
import { getClientConfiguration } from "../config.js";
import { buildRequestObjectWithKms } from "../services/authorize-service.js";
import { createPage } from "../pages/utils.js";
import { renderResponse } from "../utils.js";

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
  return renderResponse(
    200,
    createPage(`
      <h1 class="govuk-heading-l">Digital Verification Services</h1>
      <p class="govuk-body">You'll need a GOV.UK One Login to use this service. You'll be able to create a GOV.UK One Login if you do not already have one.</p>
      <p class="govuk-body">You'll be told when you sign in if you need to prove your identity. This is to keep your details safe and normally involves using photo ID like a passport or driving licence.</p>
      <form method="post" action="/authorize">
          <input type="submit" value="Start now" class="govuk-button" data-module="govuk-button"/>
      </form>
    `)
  );
};

const post = async (): Promise<APIGatewayProxyResult> => {
  const oidcConfig = await discovery(
    new URL(`${process.env.OIDC_BASE_URL}`),
    getClientConfiguration().clientId as string
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
    scope: getClientConfiguration().scopes.join(" "),
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
