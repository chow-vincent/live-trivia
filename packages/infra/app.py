#!/usr/bin/env python3
import os
import aws_cdk as cdk
from foundation_stack import FoundationStack
from service_stack import ServiceStack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-west-2"),
)

foundation = FoundationStack(app, "LiveTriviaFoundationStack", env=env)

ServiceStack(
    app,
    "LiveTriviaServiceStack",
    env=env,
    repository=foundation.repository,
    table=foundation.table,
)

app.synth()
