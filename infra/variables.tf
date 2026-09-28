variable "environment" {
  type        = string
  description = "The environment name"
  validation {
    condition     = contains(["dev", "build", "staging", "integration", "production"], var.environment)
    error_message = "Valid values for var: environment are (dev, build, staging, integration, production)"
  }
}

variable "system" {
  type        = string
  description = "The name of the system. Used in tags."
  default     = "DVS Onboarding RP"
}

variable "product" {
  type        = string
  description = "The name of the product. Used in tags."
  default     = "GOV.UK One Login"
}

variable "owner_email" {
  type        = string
  description = "The owning team's Google Group email address. Used for tagging and ECR scan notifications"
  default     = "di-orchestration@digital.cabinet-office.gov.uk"
}

variable "create_build_stacks" {
  type        = bool
  description = "Whether or not to deploy the stacks for building and signing application code. Only needed in dev and build. Defaults to false"
  default     = false
}

variable "signer_allowed_accounts" {
  type        = list(string)
  description = "The AWS account IDs that can read the code signing KMS key"
  default     = []
}

variable "transit_gateway_hub_account_id" {
  type        = string
  description = "The account ID of the account containing the Transit Gateway hub"
}

variable "transit_gateway_hub_dr_account_id" {
  type        = string
  description = "The account ID of the account containing the disaster recovery Transit Gateway hub. Should only be set in production or in accounts where we're testing a DR scenario"
  # This default matches the default value in the Transit Gateway Cross account role template
  default = "none"
}
