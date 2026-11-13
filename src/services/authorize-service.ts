import { getAuthorizeParameters } from "../helpers/authorize-helper.js";
import { signJwtWithKms } from "./kms-jwt-service.js";

export const buildRequestObjectWithKms = async (
  signingKeyAlias: string,
  nonce: string,
  state: string,
  codeVerifier: string,
  authorizationEndpoint: string
): Promise<string> => {
  const authParams = await getAuthorizeParameters(nonce, state, codeVerifier);

  const now = Math.floor(Date.now() / 1000);
  return signJwtWithKms(signingKeyAlias, {
    ...authParams,
    aud: authorizationEndpoint,
    iat: now,
    exp: now + 300,
  });
};
