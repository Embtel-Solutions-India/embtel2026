import 'server-only';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

// The only module that talks to S3. Credentials come from env (Vercel), never from code or the DB.
let client: S3Client | undefined;
const s3 = () =>
  (client ??= new S3Client({
    region: env.AWS_REGION,
    credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
  }));

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  // Keys are random and never reused, so the object can be cached forever.
  await s3().send(new PutObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
}

export function publicUrl(key: string): string {
  const base = env.AWS_S3_PUBLIC_URL_BASE?.replace(/\/+$/, '');
  return base ? `${base}/${key}` : `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
