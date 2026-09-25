resource "aws_cloudformation_stack" "vpc_stack" {
  # See https://govukverify.atlassian.net/wiki/x/YoGDVgE
  name         = "vpc"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.eu-west-2.amazonaws.com/vpc/template.yaml"

  parameters = {
    VpcType     = "Spoke"
    Environment = var.environment
    # Allowed AWS Service VPC Endpoints
    VpcLinkEnabled           = "Yes"
    ECRApiEnabled            = "Yes"
    CloudWatchLogsApiEnabled = "Yes"
    SecretsManagerApiEnabled = "Yes" # pragma: allowlist secret
    KMSApiEnabled            = "Yes"
    DynamoDBApiEnabled       = "Yes"
    AllowedDomains           = contains(["build"], var.environment) ? "*.account.gov.uk" : "none" # Required for acceptance tests to run when inside the VPC
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]

  depends_on = [aws_cloudformation_stack.transit_gateway_cross_account_role]
}
