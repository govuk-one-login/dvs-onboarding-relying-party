terraform {
  backend "s3" {
    // These fields are set using the .tfbackend files in the deploy folder
    bucket = "changeme"
    key    = "changeme"
    region = "eu-west-2"
  }
}

provider "aws" {
  region = "eu-west-2"

  default_tags {
    tags = {
      Product     = var.product
      System      = var.system
      Environment = var.environment
      Owner       = var.owner_email
    }
  }
}
