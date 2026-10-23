import {
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from "openid-client";
import { clientConfiguration } from "../config.js";

type AuthorizeParameters = {
  parameters: Record<string, string>;
  cookies: Record<string, string>;
};

export const getAuthorizeParameters =
  async (): Promise<AuthorizeParameters> => {
    const cookies: Record<string, string> = {};
    // Store the nonce and state in a session cookie so it can be checked in callback
    const generatedNonce = randomNonce();
    cookies.nonce = generatedNonce;

    const generatedState = randomState();
    cookies.state = generatedState;

    // Generate the code verifier and code challenge for PKCE
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    cookies.code_verifier = codeVerifier;

    const vtr = JSON.stringify([clientConfiguration.identityVtr]);

    const parameters: Record<string, string> = {
      redirect_uri: clientConfiguration.authorizeRedirectUrl,
      scope: clientConfiguration.scopes.join(" "),
      vtr: vtr,
      nonce: generatedNonce,
      state: generatedState,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    };

    const claims = clientConfiguration.claims;

    const result = {
      userinfo: Object.fromEntries(
        claims.map((claim: string) => [claim, null])
      ),
    };

    parameters["claims"] = JSON.stringify(result);

    return {
      parameters,
      cookies,
    };
  };
