#!/usr/bin/env python3
import os
import aws_cdk as cdk
from foundation_stack import FoundationStack
from service_stack import ServiceStack
from github_oidc_stack import GitHubOidcStack
from landing_stack import LandingStack

app = cdk.App()

account = os.environ.get("CDK_DEFAULT_ACCOUNT")

env = cdk.Environment(
    account=account,
    region=os.environ.get("CDK_DEFAULT_REGION", "us-west-2"),
)

# Landing page stack in us-east-1 (CloudFront requires ACM certs there)
landing_env = cdk.Environment(account=account, region="us-east-1")

foundation = FoundationStack(app, "LiveTriviaFoundationStack", env=env)

ServiceStack(
    app,
    "LiveTriviaServiceStack",
    env=env,
    repository=foundation.repository,
    table=foundation.table,
)

GitHubOidcStack(app, "LiveTriviaGitHubOidcStack", env=env)

LandingStack(app, "LiveTriviaLandingStack", env=landing_env)

app.synth()
