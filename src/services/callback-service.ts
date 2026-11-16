import {
  authorizationCodeGrant,
  Configuration,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
} from "openid-client";
import { signJwtWithKms } from "./kms-jwt-service.js";
import { randomUUID } from "crypto";
import { getClientConfiguration } from "../config.js";
import { APIGatewayProxyEvent } from "aws-lambda";
import { buildCurrentUrl } from "../utils.js";

export const makeTokenRequest = async (
  oidcConfig: Configuration,
  event: APIGatewayProxyEvent,
  state: string,
  nonce: string,
  codeVerifier: string
): Promise<TokenEndpointResponse & TokenEndpointResponseHelpers> => {
  const currentUrl = buildCurrentUrl(event);
  const tokenEndpoint = oidcConfig.serverMetadata().token_endpoint!;
  const clientAssertion = await buildClientAssertion(
    process.env.SIGNING_KEY_ALIAS!,
    getClientConfiguration().clientId,
    tokenEndpoint
  );
  return authorizationCodeGrant(
    oidcConfig,
    currentUrl,
    {
      expectedState: state,
      expectedNonce: nonce,
      pkceCodeVerifier: codeVerifier,
    },
    {
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientAssertion,
    }
  );
};

const buildClientAssertion = async (
  signingKeyAlias: string,
  clientId: string,
  tokenEndpoint: string
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  return signJwtWithKms(signingKeyAlias, {
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint,
    jti: randomUUID(),
    iat: now,
    exp: now + 300,
  });
};
