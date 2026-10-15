resource "aws_cloudformation_stack" "cloudfront_distribution" {
  name = "cloudfront-distribution"
  parameters = {
    DistributionAlias                                             = var.domain_name
    CloudFrontCertArn                                             = aws_cloudformation_stack.certificate_stack_virginia.outputs["CertificateARN"]
    AddWWWPrefix                                                  = false
    FraudHeaderEnabled                                            = true
    OriginCloakingHeader                                          = "none"
    PreviousOriginCloakingHeader                                  = "none"
    OriginCloakingHeaderManagedSecretRotationMonthWeekDaySchedule = "MON#2" #pragma: allowlist secret
    LogDestination                                                = "none"
  }
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/cloudfront-distribution/template-${var.cloudfront_distribution_stack_version}.yaml"
  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
  depends_on   = [aws_cloudformation_stack.certificate_stack_virginia]
}

resource "aws_cloudformation_stack" "cloudfront-notifications-infra" {
  name = "cloudfront-notifications-infra"
  parameters = {
    Environment                  = var.environment
    DeployPagerDutySnsTopic      = "No" # TODO: Switch this to "Yes" once the `pager_duty_url` secrets are set in production
    DeploySlackNotificationTopic = "No" # TODO: Switch this to "Yes" once the `slack_channel_id` and `slack_webook_id` secrets are set in all nonprod envs
  }
  provider      = aws.virginia
  template_body = file("./templates/cloudfront-notifications.yaml")
  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
