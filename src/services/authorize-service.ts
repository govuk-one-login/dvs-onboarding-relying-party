import { GetPublicKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import { createHash } from "crypto";
import { getAuthorizeParameters } from "../helpers/authorize-helper.js";

const kmsClient = new KMS({
  region: "eu-west-2",
});
let keyId: string;

const toBase64Url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

export const buildRequestObjectWithKms = async (
  signingKeyAlias: string,
  nonce: string,
  state: string,
  codeVerifier: string,
  authorizationEndpoint: string
): Promise<string> => {
  if (!keyId) {
    const { KeyId } = await kmsClient.send(
      new GetPublicKeyCommand({ KeyId: signingKeyAlias })
    );
    keyId = KeyId || "";
  }
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
      aud: authorizationEndpoint,
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
