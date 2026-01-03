import { Pool, PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * 数据库适配器接口
 */
export interface DatabaseAdapter {
  getPool(): Pool;
  getPrismaAdapter(): PrismaPg;
}

/**
 * 数据库适配器类型
 */
export type DatabaseAdapterType = "aws-rds-iam" | "aws-rds-password" | "standard";

/**
 * AWS RDS IAM 认证适配器配置
 */
export interface AwsRdsIamConfig {
  host: string;
  port: number;
  user: string;
  database: string;
  region: string;
  roleArn?: string; // Vercel OIDC 使用
}

/**
 * 标准 PostgreSQL 配置
 */
export interface StandardPgConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | object;
}

/**
 * 从环境变量获取数据库配置
 * 
 * 优先级:
 * 1. DB_ADAPTER_TYPE 环境变量 (显式指定)
 * 2. 自动检测 AWS RDS IAM (PGHOST + AWS_REGION + AWS_ROLE_ARN/AWS_ACCESS_KEY_ID)
 * 3. 标准 PostgreSQL (DATABASE_URL)
 */
export function getDatabaseConfig(): {
  type: DatabaseAdapterType;
  config: AwsRdsIamConfig | StandardPgConfig;
} {
  // 显式指定适配器类型
  const explicitType = process.env.DB_ADAPTER_TYPE as DatabaseAdapterType | undefined;
  
  if (explicitType === "standard" || (!explicitType && process.env.DATABASE_URL && !process.env.AWS_REGION)) {
    return {
      type: "standard",
      config: {
        connectionString: process.env.DATABASE_URL,
      } as StandardPgConfig,
    };
  }

  // 如果配置了 AWS RDS 相关变量，使用 AWS RDS
  if (process.env.PGHOST && process.env.AWS_REGION) {
    const useIam = !!process.env.AWS_ROLE_ARN || !!process.env.AWS_ACCESS_KEY_ID;
    
    return {
      type: useIam ? "aws-rds-iam" : "aws-rds-password",
      config: {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER!,
        database: process.env.PGDATABASE || "postgres",
        region: process.env.AWS_REGION,
        roleArn: process.env.AWS_ROLE_ARN,
      } as AwsRdsIamConfig,
    };
  }

  // 默认使用标准 PostgreSQL 连接
  return {
    type: "standard",
    config: {
      connectionString: process.env.DATABASE_URL,
    } as StandardPgConfig,
  };
}

/**
 * 创建标准 PostgreSQL 适配器
 */
export function createStandardAdapter(config: StandardPgConfig): DatabaseAdapter {
  const poolConfig: PoolConfig = config.connectionString
    ? { connectionString: config.connectionString }
    : {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
      };

  const pool = new Pool(poolConfig);
  const prismaAdapter = new PrismaPg(pool);

  return {
    getPool: () => pool,
    getPrismaAdapter: () => prismaAdapter,
  };
}
