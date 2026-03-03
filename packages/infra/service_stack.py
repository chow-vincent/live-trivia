from aws_cdk import (
    Stack,
    CfnOutput,
    Duration,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_ecr as ecr,
    aws_dynamodb as dynamodb,
)
from constructs import Construct


class ServiceStack(Stack):
    """VPC, ECS Fargate service, and ALB.

    Deployed AFTER the foundation stack and Docker image push,
    so the ECR repository already contains a valid image.
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        *,
        repository: ecr.IRepository,
        table: dynamodb.ITable,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)

        # ─── VPC (public subnets only, no NAT) ───────────────
        vpc = ec2.Vpc(
            self,
            "Vpc",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                )
            ],
        )

        # ─── ECS Cluster ─────────────────────────────────────
        cluster = ecs.Cluster(self, "Cluster", vpc=vpc)

        # ─── Fargate Service + ALB ───────────────────────────
        service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self,
            "Service",
            cluster=cluster,
            cpu=256,
            memory_limit_mib=512,
            desired_count=1,
            assign_public_ip=True,
            task_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            min_healthy_percent=100,
            circuit_breaker=ecs.DeploymentCircuitBreaker(rollback=True),
            health_check_grace_period=Duration.seconds(120),
            task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_ecr_repository(repository, tag="latest"),
                container_port=3001,
                environment={
                    "DYNAMODB_TABLE": table.table_name,
                    "USE_DYNAMODB": "true",
                    "NODE_ENV": "production",
                    "PORT": "3001",
                },
                log_driver=ecs.LogDrivers.aws_logs(stream_prefix="live-trivia"),
            ),
        )

        # Health check
        service.target_group.configure_health_check(
            path="/health",
            interval=Duration.seconds(30),
            timeout=Duration.seconds(5),
            healthy_threshold_count=2,
            unhealthy_threshold_count=3,
        )

        # Stickiness for Socket.IO (ensures WebSocket upgrade
        # hits the same task that handled the initial HTTP request)
        service.target_group.enable_cookie_stickiness(Duration.hours(1))

        # Grant DynamoDB access to the Fargate task role
        table.grant_read_write_data(service.task_definition.task_role)

        # ─── Outputs ─────────────────────────────────────────
        CfnOutput(
            self,
            "ServiceUrl",
            value=f"http://{service.load_balancer.load_balancer_dns_name}",
            description="ALB URL",
        )
