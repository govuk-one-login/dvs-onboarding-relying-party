import { GetPublicKeyCommand, KMS } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { generateKeyPairSync } from "crypto";
import { getKeyFromKms } from "./jwks-service.js";

const kmsMock = mockClient(KMS);

const rsaKey = generateKeyPairSync("rsa", {
  modulusLength: 4096,
}).publicKey;
const rsaKeyString = rsaKey.export({ type: "spki", format: "der" });
const alias = "test-key-alias";

const expectedJwk = {
  ...rsaKey.export({ format: "jwk" }),
  alg: "RS256",
  kid: "e1b10b31cba4835b4bcddfce3f451cff51534eee658e603d971edc4f80b37e3c", // pragma: allowlist secret
};

describe("JWKS service tests", () => {
  beforeEach(() => {
    kmsMock.reset();
  });

  it("should get key from KMS and create JWK", async () => {
    kmsMock.on(GetPublicKeyCommand, { KeyId: alias }).resolves({
      KeyId: alias,
      PublicKey: new Uint8Array(rsaKeyString),
    });

    const actualJwk = await getKeyFromKms(alias);

    expect(actualJwk).toStrictEqual(expectedJwk);
  });

  it("should throw error if key not found in KMS", async () => {
    kmsMock.on(GetPublicKeyCommand, { KeyId: alias }).resolves({});

    await expect(getKeyFromKms(alias)).rejects.toThrow();
  });

  it("should throw error if key is not RSA signing key in KMS", async () => {
    const ecKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey;
    const ecKeyString = ecKey.export({ type: "spki", format: "der" });
    kmsMock.on(GetPublicKeyCommand, { KeyId: alias }).resolves({
      KeyId: alias,
      PublicKey: new Uint8Array(ecKeyString),
    });

    await expect(getKeyFromKms(alias)).rejects.toThrow();
  });
});
