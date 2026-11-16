import { APIGatewayProxyEvent } from "aws-lambda";
import { buildCurrentUrl, parseCookies } from "./utils.js";

describe("Utils tests", () => {
  it("should parse cookies from request headers", () => {
    const request = {
      headers: {
        cookie: "cookie1=test; cookie2=abc",
      },
    } as unknown as APIGatewayProxyEvent;

    const cookies = parseCookies(request);

    expect(cookies).toStrictEqual({
      cookie1: "test",
      cookie2: "abc",
    });
  });

  it("should build current URL from request headers", () => {
    process.env.DVS_BASE_URL = "https://localhost:5000";
    const request = {
      headers: {
        host: "localhost",
      },
      path: "/abc/def",
      queryStringParameters: {
        param1: "test",
        param2: "test",
      },
    } as unknown as APIGatewayProxyEvent;

    const currentUrl = buildCurrentUrl(request);

    expect(currentUrl).toStrictEqual(
      new URL("https://localhost:5000/abc/def?param1=test&param2=test")
    );
  });
});
