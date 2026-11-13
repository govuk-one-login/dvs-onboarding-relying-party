import { exportJWK, generateKeyPair, SignJWT } from "jose";

let verifyCoreIdentity: typeof import("./core-identity-service.js").verifyCoreIdentity;

const IDENTITY_BASE_URL = "https://identity.integration.account.gov.uk";
const CONTROLLER_ID = "did:web:identity.integration.account.gov.uk";
const KEY_ID =
  "c9f8da1c87525bb41653583c2d05274e85805ab7d0abc58376c7128129daa936"; // pragma: allowlist secret
const KID = `${CONTROLLER_ID}#${KEY_ID}`;
const CLIENT_ID = "test-client-id";
const SUBJECT = "urn:fdc:gov.uk:2022:test-subject";

const credentialSubject = {
  name: [
    {
      validFrom: "2020-03-01",
      nameParts: [
        { value: "Alice", type: "GivenName" },
        { value: "Jane", type: "GivenName" },
        { value: "Doe", type: "FamilyName" },
      ],
    },
  ],
  birthDate: [{ value: "1970-01-01" }],
};

let privateKey: CryptoKey;
let publicJwk: Awaited<ReturnType<typeof exportJWK>>;

const buildCoreIdentityJwt = async (
  overrides: {
    kid?: string;
    alg?: string;
    iss?: string;
    aud?: string;
    sub?: string;
    expired?: boolean;
    credentialSubject?: unknown;
  } = {}
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    vot: "P2",
    vc: {
      type: ["VerifiableCredential", "VerifiableIdentityCredential"],
      credentialSubject: overrides.credentialSubject ?? credentialSubject,
    },
  })
    .setProtectedHeader({
      alg: overrides.alg ?? "ES256",
      kid: overrides.kid ?? KID,
    })
    .setIssuer(overrides.iss ?? `${IDENTITY_BASE_URL}/`)
    .setAudience(overrides.aud ?? CLIENT_ID)
    .setSubject(overrides.sub ?? SUBJECT)
    .setIssuedAt(now)
    .setExpirationTime(overrides.expired ? now - 60 : now + 300)
    .sign(privateKey);
};

const mockDidResponse = (body: unknown, cacheControl = "max-age=3600") => {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "cache-control": cacheControl }),
    json: async () => body,
  } as Response;
};

const didDocument = () => ({
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/jwk/v1",
  ],
  id: CONTROLLER_ID,
  assertionMethod: [
    {
      id: KID,
      type: "JsonWebKey",
      controller: CONTROLLER_ID,
      publicKeyJwk: publicJwk,
    },
  ],
});

describe("Core identity service tests", () => {
  beforeAll(async () => {
    const keyPair = await generateKeyPair("ES256", { extractable: true });
    privateKey = keyPair.privateKey;
    publicJwk = await exportJWK(keyPair.publicKey);
  });

  beforeEach(async () => {
    process.env.IDENTITY_BASE_URL = IDENTITY_BASE_URL;
    vi.restoreAllMocks();
    vi.resetModules();
    // Re-import so the module-level DID cache is fresh for every test.
    verifyCoreIdentity = (await import("./core-identity-service.js"))
      .verifyCoreIdentity;
  });

  it("should verify a valid core identity JWT and extract name and dob", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt();

    const result = await verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID);

    expect(result).toStrictEqual({
      name: "Alice Jane Doe",
      dob: "1970-01-01",
      vot: "P2",
    });
  });

  it("should call the DID endpoint with a User-Agent header", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt();

    await verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID);

    expect(fetchSpy).toHaveBeenCalledWith(
      `${IDENTITY_BASE_URL}/.well-known/did.json`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
        }),
      })
    );
  });

  it("should throw if the DID endpoint returns a non-ok response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: async () => ({}),
    } as Response);
    const jwt = await buildCoreIdentityJwt();

    await expect(verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID)).rejects.toThrow(
      /Failed to fetch DID document: 403/
    );
  });

  it("should throw if the controller id does not match the DID document", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      mockDidResponse({ ...didDocument(), id: "did:web:evil.example.com" })
    );
    const jwt = await buildCoreIdentityJwt();

    await expect(verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID)).rejects.toThrow(
      /DID controller mismatch/
    );
  });

  it("should throw if the kid is not present in the DID document", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt({
      kid: `${CONTROLLER_ID}#unknown-key`,
    });

    await expect(verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID)).rejects.toThrow(
      /No assertion method matches kid/
    );
  });

  it("should throw if the JWT alg is not ES256", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    // sign with a header alg of RS256 but still EC key -> header check fails first
    const jwt = await buildCoreIdentityJwt();
    const [, payload, signature] = jwt.split(".");
    const forgedHeader = Buffer.from(
      JSON.stringify({ alg: "none", kid: KID })
    ).toString("base64url");
    const forged = `${forgedHeader}.${payload}.${signature}`;

    await expect(
      verifyCoreIdentity(forged, SUBJECT, CLIENT_ID)
    ).rejects.toThrow(/Unexpected core identity JWT header/);
  });

  it("should throw if the issuer does not match", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt({
      iss: "https://evil.example.com/",
    });

    await expect(verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID)).rejects.toThrow();
  });

  it("should throw if the audience does not match the client id", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt({ aud: "some-other-client" });

    await expect(verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID)).rejects.toThrow();
  });

  it("should throw if the JWT has expired", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt({ expired: true });

    await expect(verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID)).rejects.toThrow();
  });

  it("should throw if the sub does not match the expected sub", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt();

    await expect(
      verifyCoreIdentity(jwt, "different-subject", CLIENT_ID)
    ).rejects.toThrow(/sub does not match/);
  });

  it("should throw if the credential is missing name or birthDate", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(mockDidResponse(didDocument()));
    const jwt = await buildCoreIdentityJwt({
      credentialSubject: { name: [], birthDate: [] },
    });

    await expect(verifyCoreIdentity(jwt, SUBJECT, CLIENT_ID)).rejects.toThrow(
      /missing name or birthDate/
    );
  });
});
