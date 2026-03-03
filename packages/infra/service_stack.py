from aws_cdk import (
    Stack,
    CfnOutput,
    Duration,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_ecr as ecr,
    aws_dynamodb as dynamodb,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_elasticloadbalancingv2 as elbv2,
)
from constructs import Construct


class ServiceStack(Stack):
    """VPC, ECS Fargate service, ALB with HTTPS, and Route 53 DNS.

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

        domain_name = "hostedtrivia.com"
        app_domain = f"app.{domain_name}"

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

        # ─── DNS + TLS ───────────────────────────────────────
        hosted_zone = route53.HostedZone.from_lookup(
            self, "Zone", domain_name=domain_name
        )

        certificate = acm.Certificate(
            self,
            "Cert",
            domain_name=app_domain,
            validation=acm.CertificateValidation.from_dns(hosted_zone),
        )

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
            certificate=certificate,
            domain_name=app_domain,
            domain_zone=hosted_zone,
            protocol=elbv2.ApplicationProtocol.HTTPS,
            ssl_policy=elbv2.SslPolicy.RECOMMENDED_TLS,
            redirect_http=True,
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

        # ─── Additional DNS records ──────────────────────────
        # AAAA (IPv6) for app subdomain — the construct only creates the A record
        route53.AaaaRecord(
            self,
            "AppAAAA",
            zone=hosted_zone,
            record_name=app_domain,
            target=route53.RecordTarget.from_alias(
                targets.LoadBalancerTarget(service.load_balancer)
            ),
        )

        # ─── Outputs ─────────────────────────────────────────
        CfnOutput(
            self,
            "ServiceUrl",
            value=f"https://{app_domain}",
            description="Application URL",
        )
