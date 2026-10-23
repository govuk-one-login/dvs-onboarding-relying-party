import { calculatePKCECodeChallenge } from "openid-client";
import { clientConfiguration } from "../config.js";

export const getAuthorizeParameters = async (
  nonce: string,
  state: string,
  codeVerifier: string
): Promise<Record<string, string>> => {
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

  return {
    redirect_uri: clientConfiguration.redirectUrl,
    scope: clientConfiguration.scopes.join(" "),
    vtr: JSON.stringify([clientConfiguration.vtr]),
    nonce,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    iss: clientConfiguration.clientId,
    client_id: clientConfiguration.clientId,
    response_type: "code",
    ui_locales: clientConfiguration.uiLocales,
    claims: JSON.stringify({
      userinfo: Object.fromEntries(
        clientConfiguration.claims.map((claim: string) => [claim, null])
      ),
    }),
  };
};
