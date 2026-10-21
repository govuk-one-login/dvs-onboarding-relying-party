import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { getKeyFromKms } from "../services/jwks-service.js";
import { logger } from "../logger.js";
import { JWK } from "jose";
let jwk: JWK;
export const handler: Handler = async (
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const alias = process.env.SIGNING_KEY_ALIAS || "";
  try {
    if (!jwk) {
      jwk = await getKeyFromKms(alias);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        keys: [jwk],
      }),
    };
  } catch (_e) {
    logger.info(`Could not find signing key with alias: "${alias}"`);
    return {
      statusCode: 500,
      body: "Internal server error",
    };
  }
};
