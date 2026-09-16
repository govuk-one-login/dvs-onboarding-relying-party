# dvs-onboarding-relying-party

## Running unit tests
Use `npm run test:unit` to run unit tests.

## Running integration tests

Integration tests are found in the `integration-tests` folder.

If you want to run the integration tests locally, you can run the following commands:

```sh
npm run dynamodblocal:up     # Starts DynamoDBLocal in its own container
npm run test:integration
npm run dynamodblocal:down
```

## Development
You should install the [pre-commit](http://pre-commit.com/) config by running `pre-commit install` in the root of the repository
