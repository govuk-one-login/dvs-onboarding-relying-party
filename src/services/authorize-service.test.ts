import { GetPublicKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { generateKeyPairSync } from "crypto";

let buildRequestObjectWithKms: typeof import("./authorize-service.js").buildRequestObjectWithKms;

const kmsMock = mockClient(KMS);
const rsaKey = generateKeyPairSync("rsa", {
  modulusLength: 4096,
}).publicKey;
const rsaKeyString = rsaKey.export({ type: "spki", format: "der" });
const keyAlias = "test-key-alias";
const nonce = "test-nonce";
const state = "test-state";
const codeVerifier = "test-code-verifier";
const authEndpoint = "https://localhost:4400/authorize";
const DATE_NOW = Date.UTC(2025, 1, 1, 12, 30);
describe("Authorize service tests", () => {
  beforeEach(async () => {
    process.env.CLIENT_ID = "test-client-id";
    process.env.OIDC_AUTHORIZE_REDIRECT_URL = "https://localhost:5000/callback";
    vi.useFakeTimers();
    vi.setSystemTime(DATE_NOW);
    buildRequestObjectWithKms = (await import("./authorize-service.js"))
      .buildRequestObjectWithKms;
  });
  afterEach(() => {
    vi.resetAllMocks();
  });
  it("should build signed request object", async () => {
    kmsMock.on(GetPublicKeyCommand, { KeyId: keyAlias }).resolves({
      KeyId: keyAlias,
      PublicKey: new Uint8Array(rsaKeyString),
    });
    kmsMock.on(SignCommand).resolves({
      Signature: Buffer.from("test-signature"),
    });

    const requestObject = await buildRequestObjectWithKms(
      keyAlias,
      nonce,
      state,
      codeVerifier,
      authEndpoint
    );

    const header = JSON.parse(
      Buffer.from(requestObject.split(".")[0], "base64url").toString()
    );
    const payload = JSON.parse(
      Buffer.from(requestObject.split(".")[1], "base64url").toString()
    );
    expect(header).toStrictEqual({
      alg: "RS256",
      kid: "e1b10b31cba4835b4bcddfce3f451cff51534eee658e603d971edc4f80b37e3c", // pragma: allowlist secret
      typ: "JWT",
    });
    expect(payload).toStrictEqual({
      aud: "https://localhost:4400/authorize",
      claims:
        '{"userinfo":{"https://vocab.account.gov.uk/v1/coreIdentityJWT":null}}',
      client_id: "test-client-id",
      code_challenge: "0FLIKahrX7kqxncwhV5WD82lu_wi5GA8FsRSLubaOpU", // pragma: allowlist secret
      code_challenge_method: "S256",
      exp: 1738413300,
      iat: 1738413000,
      iss: "test-client-id",
      nonce: "test-nonce",
      redirect_uri: "https://localhost:5000/callback",
      response_type: "code",
      scope: "openid email phone",
      state: "test-state",
      ui_locales: "en",
      vtr: '["P2.Cl.Cm"]',
    });
  });
});
