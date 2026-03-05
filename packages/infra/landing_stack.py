from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_route53_targets as targets,
)
from constructs import Construct


class LandingStack(Stack):
    """S3 + CloudFront for the static landing page at hostedtrivia.com.

    Deployed in us-east-1 because CloudFront requires ACM certs in that region.
    """

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        domain_name = "hostedtrivia.com"
        www_domain = f"www.{domain_name}"

        # ─── S3 Bucket ─────────────────────────────────────────
        self.bucket = s3.Bucket(
            self,
            "LandingBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # ─── DNS + TLS ─────────────────────────────────────────
        hosted_zone = route53.HostedZone.from_lookup(
            self, "Zone", domain_name=domain_name
        )

        certificate = acm.Certificate(
            self,
            "Cert",
            domain_name=domain_name,
            subject_alternative_names=[www_domain],
            validation=acm.CertificateValidation.from_dns(hosted_zone),
        )

        # ─── Security Response Headers ─────────────────────────
        response_headers_policy = cloudfront.ResponseHeadersPolicy(
            self,
            "SecurityHeaders",
            security_headers_behavior=cloudfront.ResponseSecurityHeadersBehavior(
                strict_transport_security=cloudfront.ResponseHeadersStrictTransportSecurity(
                    access_control_max_age=Duration.seconds(63072000),  # 2 years
                    include_subdomains=True,
                    preload=True,
                    override=True,
                ),
                content_type_options=cloudfront.ResponseHeadersContentTypeOptions(
                    override=True,
                ),
                frame_options=cloudfront.ResponseHeadersFrameOptions(
                    frame_option=cloudfront.HeadersFrameOption.DENY,
                    override=True,
                ),
                referrer_policy=cloudfront.ResponseHeadersReferrerPolicy(
                    referrer_policy=cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    override=True,
                ),
            ),
        )

        # ─── CloudFront Distribution ───────────────────────────
        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_root_object="index.html",
            domain_names=[domain_name, www_domain],
            certificate=certificate,
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(self.bucket),
                compress=True,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                response_headers_policy=response_headers_policy,
            ),
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
            ],
        )

        # ─── Route 53 DNS Records ──────────────────────────────
        cf_target = route53.RecordTarget.from_alias(
            targets.CloudFrontTarget(self.distribution)
        )

        route53.ARecord(
            self, "ApexA", zone=hosted_zone, target=cf_target,
        )
        route53.AaaaRecord(
            self, "ApexAAAA", zone=hosted_zone, target=cf_target,
        )
        route53.ARecord(
            self, "WwwA", zone=hosted_zone,
            record_name=www_domain, target=cf_target,
        )
        route53.AaaaRecord(
            self, "WwwAAAA", zone=hosted_zone,
            record_name=www_domain, target=cf_target,
        )

        # ─── Outputs ───────────────────────────────────────────
        CfnOutput(
            self, "BucketName",
            value=self.bucket.bucket_name,
            description="S3 bucket for landing page assets",
        )
        CfnOutput(
            self, "DistributionId",
            value=self.distribution.distribution_id,
            description="CloudFront distribution ID",
        )
        CfnOutput(
            self, "DistributionDomain",
            value=self.distribution.distribution_domain_name,
            description="CloudFront distribution domain name",
        )
