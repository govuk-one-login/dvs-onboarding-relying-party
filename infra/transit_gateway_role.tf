resource "aws_cloudformation_stack" "transit_gateway_cross_account_role" {
  # See https://govukverify.atlassian.net/wiki/x/YoGDVgE
  name         = "transit-gateway-cross-account-role"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.eu-west-2.amazonaws.com/tgw-cross-account-role/template.yaml"

  parameters = merge({
    HubAccountId = var.transit_gateway_hub_account_id
    }, var.environment == "production" ? {
    // Only set this value in production environments.
    DisasterRecoveryHubAccountId = var.transit_gateway_hub_dr_account_id
  } : {})

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
