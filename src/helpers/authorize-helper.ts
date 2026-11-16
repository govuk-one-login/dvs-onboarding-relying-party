import { calculatePKCECodeChallenge } from "openid-client";
import { getClientConfiguration } from "../config.js";

export const getAuthorizeParameters = async (
  nonce: string,
  state: string,
  codeVerifier: string
): Promise<Record<string, string>> => {
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

  return {
    redirect_uri: getClientConfiguration().redirectUrl,
    scope: getClientConfiguration().scopes.join(" "),
    vtr: JSON.stringify([getClientConfiguration().vtr]),
    nonce,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    iss: getClientConfiguration().clientId,
    client_id: getClientConfiguration().clientId,
    response_type: "code",
    ui_locales: getClientConfiguration().uiLocales,
    claims: JSON.stringify({
      userinfo: Object.fromEntries(
        getClientConfiguration().claims.map((claim: string) => [claim, null])
      ),
    }),
  };
};
