import { GetPublicKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { buildAuthorizationUrl, Configuration } from "openid-client";
import { clientConfiguration, serverMetadata } from "../config.js";
import { createHash, randomUUID } from "crypto";
import { logger } from "../logger.js";

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

  const request = await buildRequestObjectWithKms();
  const authorizeUrl = buildAuthorizationUrl(oidcConfig, {
    request,
  });
  return {
    statusCode: 302,
    headers: {
      Location: authorizeUrl.toString(),
    },
    body: "",
  };
};

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

const buildRequestObjectWithKms = async (): Promise<string> => {
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

  const payload = b64url(
    JSON.stringify({
      iss: clientConfiguration.clientId,
      aud: serverMetadata.issuer,
      client_id: clientConfiguration.clientId,
      redirect_uri: clientConfiguration.authorizeRedirectUrl,
      response_type: "code",
      scope: clientConfiguration.scopes.join(" "),
      state: randomUUID(),
      nonce: randomUUID(),
      vtr: [clientConfiguration.identityVtr],
      ui_locales: clientConfiguration.uiLocales,
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
      SigningAlgorithm: "ECDSA_SHA_256",
    })
  );

  return `${signingInput}.${b64url(Buffer.from(Signature!))}`;
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
