import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET_NAME;

  if (!region || !bucket) {
    throw new Error(
      "S3 not configured. Set AWS_REGION, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY."
    );
  }

  return new S3Client({ region });
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error("S3_BUCKET_NAME is not set.");

  const client = getS3Client();
  const key = relKey.replace(/^\/+/, "");

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );

  const region = process.env.AWS_REGION;
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error("S3_BUCKET_NAME is not set.");

  const client = getS3Client();
  const key = relKey.replace(/^\/+/, "");

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 }
  );

  return { key, url };
}
