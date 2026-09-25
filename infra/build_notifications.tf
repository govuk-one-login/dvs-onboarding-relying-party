resource "aws_cloudformation_stack" "build_notifications_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3377168419/Slack+build+notifications+-+via+AWS+Chatbot
  name         = "build-notifications"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/build-notifications/template.yaml"

  parameters = {
    InitialNotificationStack        = var.environment == "dev" || var.environment == "build" || var.environment == "production" ? "No" : "Yes" # Had to disable this in dev, build and prod because of stack deployment issues
    BuildNotificationSlackChannelId = var.environment == "production" ? "C0C469LR76C" : "C0C35MTD9M1"
    EnrichedNotifications           = "True"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
