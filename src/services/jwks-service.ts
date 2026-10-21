import { GetPublicKeyCommand, KMS } from "@aws-sdk/client-kms";
import { createHash } from "crypto";
import { JWK, importSPKI, exportJWK } from "jose";
import { logger } from "../logger.js";

const kmsClient = new KMS({
  region: "eu-west-2",
});

export const getKeyFromKms = async (alias: string): Promise<JWK> => {
  logger.info("Fetching signing key from KMS");

  const { PublicKey, KeyId } = await kmsClient.send(
    new GetPublicKeyCommand({ KeyId: alias })
  );

  if (!PublicKey || !KeyId) {
    throw new Error("No key found");
  }
  const b64 = Buffer.from(PublicKey).toString("base64");
  const pem = `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;
  const cryptoKey = await importSPKI(pem, "ES256");
  const jwk = await exportJWK(cryptoKey);
  jwk.kid = createHash("SHA256").update(KeyId, "utf8").digest("hex");
  jwk.alg = "ES256";
  return jwk;
};
