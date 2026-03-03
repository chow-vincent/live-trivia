from aws_cdk import (
    Stack,
    CfnOutput,
    aws_iam as iam,
)
from constructs import Construct


class GitHubOidcStack(Stack):
    """IAM OIDC provider + role for GitHub Actions.

    One-time stack — deploy manually, then never touched again.
    deploy.sh only targets FoundationStack and ServiceStack by name,
    so this stack is naturally excluded from routine deploys.

    After deploying, set the RoleArn output as the AWS_ROLE_ARN
    secret in your GitHub repository.
    """

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        github_org = "chow-vincent"
        repo_name = "live-trivia"

        provider = iam.OpenIdConnectProvider(
            self,
            "GitHubOidc",
            url="https://token.actions.githubusercontent.com",
            client_ids=["sts.amazonaws.com"],
        )

        role = iam.Role(
            self,
            "DeployRole",
            role_name="github-actions-live-trivia",
            assumed_by=iam.WebIdentityPrincipal(
                provider.open_id_connect_provider_arn,
                conditions={
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    },
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": f"repo:{github_org}/{repo_name}:ref:refs/heads/main",
                    },
                },
            ),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AdministratorAccess"
                ),
            ],
        )

        CfnOutput(
            self,
            "RoleArn",
            value=role.role_arn,
            description="ARN for GitHub Actions to assume",
        )
