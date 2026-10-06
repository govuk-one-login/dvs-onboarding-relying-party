import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = `${process.env.VITEST_WORKER_ID}-Journey-Result`;
export const integrationTest = test
  .extend("dynamoClient", async ({}) => {
    return new DynamoDBClient({
      region: "eu-west-2",
      ...(process.env.DYNAMO_ENDPOINT && {
        endpoint: process.env.DYNAMO_ENDPOINT,
      }),
    });
  })
  .extend("dynamoDocClient", async ({ dynamoClient }) => {
    return DynamoDBDocument.from(dynamoClient);
  })
  .extend("getResult", async ({ dynamoDocClient }) => {
    return async (referenceId: string) =>
      await dynamoDocClient.get({
        TableName: TABLE_NAME,
        Key: { referenceId },
      });
  });
integrationTest.beforeEach(async ({ dynamoClient }) => {
  await createTable(dynamoClient);
});
integrationTest.afterEach(async ({ dynamoClient }) => {
  try {
    await deleteTable(dynamoClient);
  } catch (err) {
    console.log("Table does not exist");
  }
});

const createTable = async (dynamoClient: DynamoDBClient) => {
  const command = new CreateTableCommand({
    TableName: TABLE_NAME,
    AttributeDefinitions: [
      {
        AttributeName: "referenceId",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "referenceId",
        KeyType: "HASH",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });
  await dynamoClient.send(command);
};

const deleteTable = async (dynamoClient: DynamoDBClient) => {
  console.log(`Table: ${TABLE_NAME}`);
  const command = new DeleteTableCommand({
    TableName: TABLE_NAME,
  });

  await dynamoClient.send(command);
};
