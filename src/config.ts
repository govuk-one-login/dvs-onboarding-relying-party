export const clientConfiguration = {
  clientId: process.env.CLIENT_ID || "",
  issuer: process.env.CLIENT_ID,
  scopes: ["openid", "email", "phone"],
  redirectUrl: process.env.OIDC_AUTHORIZE_REDIRECT_URL || "",
  claims: ["https://vocab.account.gov.uk/v1/coreIdentityJWT"],
  tokenAuthMethod: "private_key_jwt",
  vtr: "P2.Cl.Cm",
  uiLocales: "en",
  requireJAR: true,
};

export const getLoginSecretId = (): string => {
  if (!process.env.LOGIN_SECRET_ID) {
    throw new Error("Invalid configuration");
  }
  return process.env.LOGIN_SECRET_ID;
};
