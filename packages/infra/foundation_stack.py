from aws_cdk import (
    Stack,
    RemovalPolicy,
    CfnOutput,
    aws_ecr as ecr,
    aws_dynamodb as dynamodb,
)
from constructs import Construct


class FoundationStack(Stack):
    """ECR repository and DynamoDB table — no dependency on a container image."""

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # ─── ECR Repository ───────────────────────────────────
        self.repository = ecr.Repository(
            self,
            "AppRepo",
            repository_name="live-trivia",
            removal_policy=RemovalPolicy.DESTROY,
            empty_on_delete=True,
            lifecycle_rules=[
                ecr.LifecycleRule(
                    max_image_count=5,
                    description="Keep only 5 most recent images",
                )
            ],
        )

        # ─── DynamoDB Table ───────────────────────────────────
        self.table = dynamodb.Table(
            self,
            "TriviaTable",
            table_name="LiveTrivia",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="SK", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="ttl",
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ─── GSI: Query games by host ───────────────────────
        self.table.add_global_secondary_index(
            index_name="hostId-createdAt-index",
            partition_key=dynamodb.Attribute(
                name="hostId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.NUMBER
            ),
            projection_type=dynamodb.ProjectionType.INCLUDE,
            non_key_attributes=["name", "status", "playerCount", "gameCode"],
        )

        # ─── Outputs ─────────────────────────────────────────
        CfnOutput(
            self,
            "EcrRepositoryUri",
            value=self.repository.repository_uri,
            description="ECR repository URI for pushing images",
        )

        CfnOutput(
            self,
            "TableName",
            value=self.table.table_name,
            description="DynamoDB table name",
        )
