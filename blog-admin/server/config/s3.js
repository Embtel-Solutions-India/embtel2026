const { S3Client } = require('@aws-sdk/client-s3');
const env = require('./env');

const s3Client = new S3Client({
  region: env.s3.region,
  credentials: env.s3.accessKeyId
    ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
    : undefined, // falls back to the environment's default AWS credential chain
});

function publicUrlFor(key) {
  if (env.s3.publicUrlBase) return `${env.s3.publicUrlBase.replace(/\/$/, '')}/${key}`;
  return `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${key}`;
}

module.exports = { s3Client, publicUrlFor };
