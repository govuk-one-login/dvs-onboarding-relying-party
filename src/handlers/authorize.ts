import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "GET") {
    return get();
  }
  if (event.httpMethod === "POST") {
    return renderResponse(200, "Journey started (TODO)");
  }
  return renderResponse(405, "Method not allowed");
};

const get = (): APIGatewayProxyResult => {
  return renderResponse(
    200,
    `
        <h2>DVS Micro RP</h2>
        <form method="post" action="/authorize">
            <input type="submit" value="Start journey"/>
        </form>`
  );
};
const renderResponse = (
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
