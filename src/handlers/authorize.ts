import { GetPublicKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { buildAuthorizationUrl, Configuration } from "openid-client";
import { clientConfiguration, serverMetadata } from "../config.js";
import { createHash } from "crypto";
import { logger } from "../logger.js";
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
        </form>`
  );
};

const post = async (): Promise<APIGatewayProxyResult> => {
  const oidcConfig = new Configuration(
    serverMetadata,
    clientConfiguration.clientId
  );

  const requestAndCookies = await buildRequestObjectWithKms();
  const authorizeUrl = buildAuthorizationUrl(oidcConfig, {
    request: requestAndCookies.request,
    response_type: "code",
    scope: clientConfiguration.scopes.join(" "),
  });
  return {
    statusCode: 302,
    headers: {
      Location: authorizeUrl.toString(),
    },
    multiValueHeaders: {
      "Set-Cookie": Object.entries(requestAndCookies.cookies).map(
        (key, value) => `${key}=${value}; HttpOnly; Secure; Path=/; Max-Age=600`
      ),
    },
    body: "",
  };
};

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

type RequestObjectAndCookies = {
  request: string;
  cookies: Record<string, string>;
};
const buildRequestObjectWithKms =
  async (): Promise<RequestObjectAndCookies> => {
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
    logger.info(`JWK ID: ${jwkId}`);
    const jwkId2 = createHash("sha256")
      .update(signingKeyAlias || "", "utf8")
      .digest("hex");
    logger.info(`JWK ID 2: ${jwkId2}`);
    const header = b64url(
      JSON.stringify({ alg: "RS256", typ: "JWT", kid: jwkId })
    );
    const now = Math.floor(Date.now() / 1000);
    const paramsAndCookies = await getAuthorizeParameters();

    const payload = b64url(
      JSON.stringify({
        ...paramsAndCookies.parameters,
        aud: serverMetadata.issuer,
        claims: {
          userinfo: Object.fromEntries(
            clientConfiguration.claims.map((c) => [c, null])
          ),
        },
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
    const request = `${signingInput}.${b64url(Buffer.from(Signature!))}`;
    return {
      request,
      cookies: paramsAndCookies.cookies,
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
