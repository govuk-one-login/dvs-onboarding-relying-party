import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { Result } from "../models/result.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const dynamoClient = DynamoDBDocument.from(
  new DynamoDBClient({
    region: "eu-west-2",
    ...(process.env.DYNAMO_ENDPOINT && {
      endpoint: process.env.DYNAMO_ENDPOINT,
    }),
  })
);

const TABLE_NAME = `${process.env.ENVIRONMENT}-Journey-Result`;
const TTL = 60 * 60 * 24 * 14 * 1000; // 14 days

export const saveResult = async (result: Result): Promise<void> => {
  const createdAt = Date.now();
  const ttl = Date.now() + TTL;
  await dynamoClient.put({
    TableName: TABLE_NAME,
    Item: {
      ...result,
      createdAt,
      ttl,
    },
  });
};
