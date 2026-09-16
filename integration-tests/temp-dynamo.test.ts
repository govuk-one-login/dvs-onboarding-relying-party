import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

describe("DynamoDBLocal test", () => {
  it("should connect to DynamoDBLocal", async () => {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT,
      credentials: {
        accessKeyId: "test", // pragma: allowlist secret
        secretAccessKey: "test", // pragma: allowlist secret
      },
    });

    const docClient = DynamoDBDocument.from(dynamoClient);
    const tables = await docClient.send(new ListTablesCommand());
    expect(tables.TableNames).toBeDefined();
  });
});
