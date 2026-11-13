import { decodeProtectedHeader, importJWK, jwtVerify, JWK } from "jose";
import { getIdentityBaseUrl, isStubbedEnvironment } from "../config.js";
import { logger } from "../logger.js";

type AssertionMethod = {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk: JWK;
};

type DidDocument = {
  id: string;
  assertionMethod: AssertionMethod[];
};

type NamePart = {
  value: string;
  type: string;
};

type CoreIdentityCredentialSubject = {
  name: { validFrom?: string; nameParts: NamePart[] }[];
  birthDate: { value: string }[];
};

type CoreIdentityPayload = {
  sub: string;
  vot: string;
  vc: {
    credentialSubject: CoreIdentityCredentialSubject;
  };
};

export type CoreIdentity = {
  name: string;
  dob: string;
  vot: string;
};

const USER_AGENT = "dvs-onboarding-relying-party (https://dvs.account.gov.uk)";
const DEFAULT_CACHE_SECONDS = 3600;

let cachedDid: { doc: DidDocument; expiresAt: number } | undefined;

const fetchDidDocument = async (): Promise<DidDocument> => {
  const url = `${getIdentityBaseUrl()}/.well-known/did.json`;
  logger.info("Fetching DID document from identity service");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch DID document: ${response.status}`);
  }

  const doc = (await response.json()) as DidDocument;

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(
    /max-age=(\d+)/.exec(cacheControl)?.[1] ?? DEFAULT_CACHE_SECONDS
  );
  cachedDid = { doc, expiresAt: Date.now() + maxAge * 1000 };
  return doc;
};

const getDidDocument = async (): Promise<DidDocument> => {
  if (cachedDid && Date.now() < cachedDid.expiresAt) {
    return cachedDid.doc;
  }
  return fetchDidDocument();
};

/**
 * Resolve the public key for a given kid using GOV.UK One Login's simplified
 * did:web resolution. We deliberately do NOT use a third-party did:web
 * resolver: we only ever trust the DID document served from the fixed
 * identity service URL, and match the kid against its assertionMethod entries.
 */
const resolveSigningKey = async (kid: string): Promise<JWK> => {
  const [controllerId] = kid.split("#");
  const did = await getDidDocument();

  if (did.id !== controllerId) {
    throw new Error(
      `DID controller mismatch: expected ${did.id}, got ${controllerId}`
    );
  }

  const method = did.assertionMethod?.find((m) => m.id === kid);
  if (!method) {
    // An unknown kid must not be trusted - per GOV.UK One Login guidance this
    // should be reported to them as an incident.
    throw new Error(`No assertion method matches kid ${kid}`);
  }

  return method.publicKeyJwk;
};

/**
 * Verifies the coreIdentityJWT returned in the /userinfo response for an
 * identity proving (P2) journey and extracts the user's name and date of
 * birth from the verifiable credential.
 *
 * Validation performed (per GOV.UK One Login guidance):
 *  - the JWT header alg is ES256
 *  - the signature is valid for the key referenced by the header kid, resolved
 *    from the trusted DID document
 *  - iss matches the identity service issuer
 *  - aud matches our client id
 *  - the current time is before exp
 *  - sub matches the sub from the id_token
 */
export const verifyCoreIdentity = async (
  coreIdentityJwt: string,
  expectedSub: string,
  clientId: string
): Promise<CoreIdentity> => {
  if (isStubbedEnvironment()) {
    return { name: "Test User", dob: "1997-01-01", vot: "P2" };
  } else {
    const header = decodeProtectedHeader(coreIdentityJwt);
    if (header.alg !== "ES256" || !header.kid) {
      throw new Error("Unexpected core identity JWT header");
    }

    const signingKey = await importJWK(
      await resolveSigningKey(header.kid),
      "ES256"
    );

    const { payload } = await jwtVerify(coreIdentityJwt, signingKey, {
      algorithms: ["ES256"],
      issuer: `${getIdentityBaseUrl()}/`,
      audience: clientId,
    });

    const claims = payload as unknown as CoreIdentityPayload;

    if (claims.sub !== expectedSub) {
      throw new Error("Core identity sub does not match id_token sub");
    }

    const credentialSubject = claims.vc?.credentialSubject;

    const nameParts = credentialSubject?.name?.[0]?.nameParts;
    const dob = credentialSubject?.birthDate?.[0]?.value;

    if (!nameParts?.length || !dob) {
      throw new Error("Core identity credential is missing name or birthDate");
    }

    const name = nameParts.map((part) => part.value).join(" ");

    return { name, dob, vot: claims.vot };
  }
};
