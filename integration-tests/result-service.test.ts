import { Result } from "../src/models/result.js";
import { saveResult } from "../src/services/result-service.js";
import { integrationTest } from "./base.js";

const DATE_NOW = Date.UTC(2025, 1, 1, 12, 30);

describe("Result service tests", () => {
  integrationTest(
    "should save result to dynamo table",
    async ({ getResult }) => {
      vi.useFakeTimers();
      vi.setSystemTime(DATE_NOW);

      const result: Result = {
        referenceId: "A4e7dkL",
        subjectId: "urn:fdc:gov.uk:2022:12345",
        email: "test@example.com",
        name: "Test User",
        dob: "1970-01-01",
      };

      await saveResult(result);

      const actualResult = await getResult(result.referenceId);
      expect(actualResult.Item).toStrictEqual({
        ...result,
        createdAt: DATE_NOW,
        ttl: DATE_NOW + 60 * 60 * 24 * 14 * 1000,
      });
    }
  );
});
