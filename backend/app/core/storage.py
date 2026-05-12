import boto3
from botocore.config import Config
from app.core.config import settings

s3_client = boto3.client(
    "s3",
    endpoint_url=settings.yos_endpoint_url,
    aws_access_key_id=settings.yos_access_key_id,
    aws_secret_access_key=settings.yos_secret_access_key,
    config=Config(signature_version="s3v4"),
    region_name="ru-central1",
)


def upload_file(key: str, data: bytes, content_type: str) -> None:
    s3_client.put_object(
        Bucket=settings.yos_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def delete_file(key: str) -> None:
    s3_client.delete_object(
        Bucket=settings.yos_bucket_name,
        Key=key,
    )


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.yos_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )