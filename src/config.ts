import { ServerMetadata } from "openid-client";

export const clientConfiguration = {
  clientId: process.env.CLIENT_ID || "",
  privateKey: process.env.PRIVATE_KEY, // TODO: Import this using SIGNING_KEY_ALIAS
  issuer: process.env.CLIENT_ID,
  discoveryUrl: process.env.OIDC_DISCOVERY_URL,
  scopes: ["openid", "email", "phone"],
  authorizeRedirectUrl: process.env.OIDC_AUTHORIZE_REDIRECT_URL || "", // TODO: Set this
  claims: ["https://vocab.account.gov.uk/v1/coreIdentityJWT"],
  tokenAuthMethod: "private_key_jwt",
  authenticationVtr: "Cl.Cm",
  identityVtr: "P2.Cl.Cm",
  uiLocales: "en",
  requireJAR: true,
};
const baseUrl = process.env.OIDC_BASE_URL || "";
export const serverMetadata: ServerMetadata = {
  issuer: baseUrl,
  authorization_endpoint: `${baseUrl}/authorize`,
  jwks_uri: `${baseUrl}/.well-known/jwks.json`,
  scopes_supported: clientConfiguration.scopes,
  response_types_supported: ["code"],
  response_modes_supported: ["query"],
  grant_types_supported: ["authorization_code"],
  subject_types_supported: ["public", "pairwise"],
  id_token_signing_alg_values_supported: ["ES256", "RS256"],
  claims_supported: clientConfiguration.claims,
  request_object_signing_alg_values_supported: ["RS256"],
  claim_types_supported: ["normal"],
  request_parameter_supported: clientConfiguration.requireJAR,
  request_uri_parameter_supported: false,
  ui_locales_supported: [clientConfiguration.uiLocales],
};
