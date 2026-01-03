import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Signer } from "@aws-sdk/rds-signer";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { DatabaseAdapter, AwsRdsIamConfig } from "./adapter";

/**
 * 创建 AWS RDS IAM 认证适配器
 * 
 * @param config - RDS 配置
 * @param credentialsProvider - AWS 凭证提供者
 */
export function createAwsRdsIamAdapter(
  config: AwsRdsIamConfig,
  credentialsProvider: AwsCredentialIdentityProvider
): DatabaseAdapter {
  const signer = new Signer({
    hostname: config.host,
    port: config.port,
    username: config.user,
    region: config.region,
    credentials: credentialsProvider,
  });

  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    password: () => signer.getAuthToken(),
    ssl: { rejectUnauthorized: false },
  });

  const prismaAdapter = new PrismaPg(pool);

  return {
    getPool: () => pool,
    getPrismaAdapter: () => prismaAdapter,
  };
}
