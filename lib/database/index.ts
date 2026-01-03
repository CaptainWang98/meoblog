/**
 * 数据库适配器模块
 * 
 * 支持的数据库类型:
 * - standard: 标准 PostgreSQL 连接（使用 DATABASE_URL 或独立配置）
 * - aws-rds-iam: AWS RDS PostgreSQL + IAM 认证
 * - aws-rds-password: AWS RDS PostgreSQL + 密码认证
 * 
 * 使用示例:
 * 
 * ```typescript
 * // Vercel 运行时（使用 OIDC 凭证）
 * import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
 * const credentials = awsCredentialsProvider({ roleArn: "...", clientConfig: { region: "..." } });
 * const adapter = createAwsRdsIamAdapter(config, credentials);
 * 
 * // CLI 脚本（使用环境变量凭证）
 * import { fromEnv } from "@aws-sdk/credential-providers";
 * const credentials = fromEnv();
 * const adapter = createAwsRdsIamAdapter(config, credentials);
 * 
 * // 标准 PostgreSQL
 * const adapter = createStandardAdapter({ connectionString: process.env.DATABASE_URL });
 * ```
 */

export type {
  DatabaseAdapter,
  DatabaseAdapterType,
  AwsRdsIamConfig,
  StandardPgConfig,
} from "./adapter";

export {
  getDatabaseConfig,
  createStandardAdapter,
} from "./adapter";

export { createAwsRdsIamAdapter } from "./aws-rds";
