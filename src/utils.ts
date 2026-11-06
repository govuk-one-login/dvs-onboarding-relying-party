import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const renderResponse = (
  statusCode: number,
  html: string
): APIGatewayProxyResult => {
  return {
    statusCode,
    body: html,
    headers: {
      "Content-Type": "text/html",
    },
  };
};
export const parseCookies = (
  request: APIGatewayProxyEvent
): Record<string, string> => {
  const cookieHeader = Object.entries(request.headers).find(
    ([key]) => key.toLowerCase() === "cookie"
  )?.[1];

  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const index = pair.indexOf("=");
    if (index === -1) {
      return acc;
    }
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (name) {
      // Cookie values are often percent-encoded.
      acc[name] = decodeURIComponent(value);
    }
    return acc;
  }, {});
};
export const buildCurrentUrl = (event: APIGatewayProxyEvent): URL => {
  const host = event.headers.Host ?? event.headers.host ?? "";
  const url = new URL(`https://${host}${event.path}`);
  for (const [key, value] of Object.entries(
    event.queryStringParameters ?? {}
  )) {
    if (value != null) {
      url.searchParams.set(key, value);
    }
  }
  return url;
};
