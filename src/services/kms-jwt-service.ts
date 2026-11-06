import { GetPublicKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import { createHash } from "crypto";

const kmsClient = new KMS({
  region: "eu-west-2",
});

const keyIdCache: Record<string, string> = {};

const toBase64Url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

const resolveKid = async (signingKeyAlias: string): Promise<string> => {
  if (!keyIdCache[signingKeyAlias]) {
    const { KeyId } = await kmsClient.send(
      new GetPublicKeyCommand({ KeyId: signingKeyAlias })
    );
    keyIdCache[signingKeyAlias] = KeyId || "";
  }
  return createHash("sha256")
    .update(keyIdCache[signingKeyAlias], "utf8")
    .digest("hex");
};

export const signJwtWithKms = async (
  signingKeyAlias: string,
  payload: Record<string, unknown>
): Promise<string> => {
  const kid = await resolveKid(signingKeyAlias);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const body = toBase64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;

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
