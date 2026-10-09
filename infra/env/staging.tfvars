environment                                       = "staging"
short-environment                                 = "staging"
transit_gateway_hub_account_id                    = "208182292933"
allowed_promotion_accounts                        = ["327745427323", "419187349091"]
signing_profile_arn                               = "arn:aws:signer:eu-west-2:272588486093:/signing-profiles/SigningProfile_BDvxuNCSmhLh"
signing_profile_version_arn                       = "arn:aws:signer:eu-west-2:272588486093:/signing-profiles/SigningProfile_BDvxuNCSmhLh/2XJNLV95D0"
api_artifact_source_bucket_arn                    = "arn:aws:s3:::build-dvs-rp-pipeline-artifactpromotionbucket-xnrhkohjw4sj"
api_artifact_source_bucket_event_trigger_role_arn = "arn:aws:iam::272588486093:role/PL-build-dvs-rp-pipeline-PromoTrigRole-0aa87dc3827f"
domain_name                                       = "dvs.staging.account.gov.uk"

# Stack version pinning
pipeline_stack_version             = "v2.121.0"
vpc_stack_version                  = "v4.0.0"
transit_gateway_role_stack_version = "v2.0.2"
build_notification_stack_version   = "v2.9.1"
api_gateway_logs_stack_version     = "v1.0.11"
