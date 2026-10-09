resource "aws_cloudformation_stack" "hosted_zone" {
  name = "hosted-zone"
  parameters = {
    DomainName = var.domain_name
  }
  template_body = file("./templates/hosted-zone-template.yaml")
}
