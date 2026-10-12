resource "aws_cloudformation_stack" "certificate_stack_virginia" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/4028006740/certificate+readme
  provider     = aws.virginia
  name         = "cloudfront-certificate"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/certificate/template-${var.certificate_stack_version}.yaml"

  parameters = {
    DomainName   = var.domain_name
    HostedZoneID = aws_cloudformation_stack.hosted_zone.outputs["HostedZoneID"]
  }
}

resource "aws_cloudformation_stack" "certificate_stack_london" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/4028006740/certificate+readme
  name         = "certificate"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/certificate/template-${var.certificate_stack_version}.yaml"

  parameters = {
    DomainName   = var.domain_name
    HostedZoneID = aws_cloudformation_stack.hosted_zone.outputs["HostedZoneID"]
  }
}
