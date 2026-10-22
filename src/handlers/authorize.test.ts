import { handler } from "./authorize.js";
describe("Authorize handler tests", () => {
  it("should return 200 with landing page when using method GET", async () => {
    const response = await handler(
      {
        httpMethod: "GET",
        path: "/authorize",
      },
      {} as any,
      () => {}
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Start journey");
  });

  it("should return 200 and send request to OneLogin when using method POST", async () => {
    const response = await handler(
      {
        httpMethod: "POST",
        path: "/authorize",
      },
      {} as any,
      () => {}
    );

    expect(response.statusCode).toBe(200);
    // TODO: Update assertions to check if OneLogin was invoked
    expect(response.body).toStrictEqual("Journey started (TODO)");
  });

  it("should return 405 with method not supported when using invalid method", async () => {
    const result = await handler(
      {
        httpMethod: "DELETE",
        path: "/authorize",
      },
      {} as any,
      () => {}
    );

    expect(result.statusCode).toBe(405);
    expect(result.body).toStrictEqual("Method not allowed");
  });
});
