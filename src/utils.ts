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
  const cookieHeader = request.headers.Cookie ?? request.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  const cookiesRecord: Record<string, string> = {};
  const cookies = cookieHeader.split(";");
  cookies.forEach((cookieStr: string) => {
    const key = cookieStr.split("=")[0].trim();
    const value = cookieStr.split("=")[1].trim();
    cookiesRecord[key] = decodeURIComponent(value);
  });
  return cookiesRecord;
};

export const buildCurrentUrl = (event: APIGatewayProxyEvent): URL => {
  const baseUrl = process.env.DVS_BASE_URL;
  const url = new URL(`${baseUrl}${event.path}`);
  for (const [key, value] of Object.entries(
    event.queryStringParameters ?? {}
  )) {
    if (value != null) {
      url.searchParams.set(key, value);
    }
  }
  return url;
};
