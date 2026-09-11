# Deployment

## Base stacks

The base stacks for this application are managed through Terraform.
We deploy this Terraform manually in each account.

You'll need Terraform installed first (we recommend using [tfenv](https://github.com/tfutils/tfenv)).

Use TEAM to get AWS permissions to deploy to all environments other than `dev`.
You'll need to request the admin role, not power user.

Follow the steps outlined in the [Accounts confluence page](https://govukverify.atlassian.net/wiki/spaces/Orch/pages/3764715856/Accounts#Setting-up-a-profile) to set up a profile.

To deploy the Terraform (in build) run:

```sh
cd infra
# You can either login using a profile
AWS_PROFILE=<profile_name>
aws sso login
# OR paste in the credentials from the AWS console
export AWS_ACCESS_KEY_ID="****"
export AWS_SECRET_ACCESS_KEY="****"
export AWS_SESSION_TOKEN="****"

terraform init -backend-config=env/deploy/build.tfbackend
terraform plan -var-file=env/build.tfvars
terraform apply -var-file=env/build.tfvars
```

> [!NOTE]
> You'll get a warning about an existing backend when running `terraform init`
> if you've already initialised a backend for a different environment.
>
> You should re-run your command with the `-reconfigure` flag as we don't want
> to migrate state between environments:
>
> `terraform init -backend-config=env/deploy/dev.tfbackend -reconfigure`
