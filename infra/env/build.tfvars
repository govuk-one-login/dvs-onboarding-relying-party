environment                    = "build"
short-environment              = "build"
create_build_stacks            = true
signer_allowed_accounts        = ["015048356703", "327745427323", "419187349091"]
transit_gateway_hub_account_id = "731493186013"
container_signer_kms_key_arn   = "arn:aws:kms:eu-west-2:272588486093:key/3ee68c53-4924-470a-bea6-51709864b5cf"
allowed_promotion_accounts     = ["015048356703"]
signing_profile_arn            = "arn:aws:signer:eu-west-2:272588486093:/signing-profiles/SigningProfile_BDvxuNCSmhLh"
signing_profile_version_arn    = "arn:aws:signer:eu-west-2:272588486093:/signing-profiles/SigningProfile_BDvxuNCSmhLh/2XJNLV95D0"
domain_name                    = "dvs.build.account.gov.uk"

# Stack version pinning
pipeline_stack_version                 = "v2.121.1"
vpc_stack_version                      = "v4.0.1"
transit_gateway_role_stack_version     = "v2.0.2"
build_notification_stack_version       = "v2.10.0"
api_gateway_logs_stack_version         = "v1.0.11"
container_signer_stack_version         = "v1.1.8"
signer_stack_version                   = "v1.0.14"
github_identity_provider_stack_version = "v1.1.7"
