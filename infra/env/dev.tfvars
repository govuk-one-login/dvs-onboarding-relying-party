environment                    = "dev"
short-environment              = "dev"
create_build_stacks            = true
signer_allowed_accounts        = []
transit_gateway_hub_account_id = "796973488515"
container_signer_kms_key_arn   = "arn:aws:kms:eu-west-2:646251771923:key/80a64d5a-d73a-46d6-92cf-2a1aa8dd5031"
signing_profile_arn            = "arn:aws:signer:eu-west-2:646251771923:/signing-profiles/SigningProfile_m7sYFEdtaewh"
signing_profile_version_arn    = "arn:aws:signer:eu-west-2:646251771923:/signing-profiles/SigningProfile_m7sYFEdtaewh/oSyHIvVSzv"
domain_name                    = "dvs.dev.account.gov.uk"

# Stack version pinning
pipeline_stack_version                 = "v2.121.1"
vpc_stack_version                      = "v4.0.1"
transit_gateway_role_stack_version     = "v2.0.2"
build_notification_stack_version       = "v2.10.0"
api_gateway_logs_stack_version         = "v1.0.11"
container_signer_stack_version         = "v1.1.8"
signer_stack_version                   = "v1.0.14"
github_identity_provider_stack_version = "v1.1.7"
