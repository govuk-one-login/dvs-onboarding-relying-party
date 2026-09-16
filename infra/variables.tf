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
}
