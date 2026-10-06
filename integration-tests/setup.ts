process.env.DYNAMODB_LOCAL_ENDPOINT = "http://127.0.0.1:8000";
process.env.AWS_ENDPOINT_URL_DYNAMODB = "http://127.0.0.1:8000";
process.env.AWS_REGION = "eu-west-2";
process.env.AWS_ACCESS_KEY_ID = "test"; // pragma: allowlist secret
process.env.AWS_SECRET_ACCESS_KEY = "test"; // pragma: allowlist secret
process.env.ENVIRONMENT = process.env.VITEST_WORKER_ID;
