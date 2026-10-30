import { GetPublicKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import {
  buildAuthorizationUrl,
  Configuration,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from "openid-client";
import { clientConfiguration } from "../config.js";
import { createHash } from "crypto";
import { getAuthorizeParameters } from "../helpers/authorize-helper.js";

const kmsClient = new KMS({
  region: "eu-west-2",
});
let keyId: string;

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
    `
      <h2>DVS Micro RP</h2>
      <form method="post" action="/authorize">
          <input type="submit" value="Start journey"/>
      </form>
    `
  );
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
    nonce,
    state,
    codeVerifier,
    oidcConfig
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

const toBase64Url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

const buildRequestObjectWithKms = async (
  nonce: string,
  state: string,
  codeVerifier: string,
  oidcConfig: Configuration
): Promise<string> => {
  if (!keyId) {
    const { KeyId } = await kmsClient.send(
      new GetPublicKeyCommand({ KeyId: process.env.SIGNING_KEY_ALIAS })
    );
    keyId = KeyId || "";
  }
  const signingKeyAlias = process.env.SIGNING_KEY_ALIAS || "";
  const jwkId = createHash("sha256")
    .update(keyId || "", "utf8")
    .digest("hex");
  const header = toBase64Url(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: jwkId })
  );

  const authParams = await getAuthorizeParameters(nonce, state, codeVerifier);

  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(
    JSON.stringify({
      ...authParams,
      aud: oidcConfig.serverMetadata().authorization_endpoint,
      iat: now,
      exp: now + 300,
    })
  );

  const signingInput = `${header}.${payload}`;
  const { Signature } = await kmsClient.send(
    new SignCommand({
      KeyId: signingKeyAlias,
      Message: Buffer.from(signingInput),
      MessageType: "RAW",
      SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
    })
  );
  return `${signingInput}.${toBase64Url(Buffer.from(Signature!))}`;
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
