import { PrismaClient } from "./generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * 检测是否在 Vercel 环境中
 * VERCEL 环境变量在 Vercel 构建和运行时都会设置
 */
const isVercel = !!process.env.VERCEL;

/**
 * 检测是否可以使用 AWS RDS IAM 认证
 * - 在 Vercel 部署环境中，OIDC token 通过请求头传递，这里检测 VERCEL 环境变量
 * - 在本地开发时，使用 `vercel env pull` 拉取的 VERCEL_OIDC_TOKEN
 */
const canUseOidc = isVercel || !!process.env.VERCEL_OIDC_TOKEN;

// 全局单例
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * 创建数据库连接池
 */
function createPool(): Pool {
  if (globalForPrisma.pool) {
    return globalForPrisma.pool;
  }

  let pool: Pool;

  if (canUseOidc) {
    // 使用 AWS RDS IAM 认证（Vercel 部署或本地 vercel env pull）
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { awsCredentialsProvider } = require("@vercel/functions/oidc");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Signer } = require("@aws-sdk/rds-signer");

    const signer = new Signer({
      hostname: process.env.PGHOST!,
      port: Number(process.env.PGPORT || 5432),
      username: process.env.PGUSER!,
      region: process.env.AWS_REGION!,
      credentials: awsCredentialsProvider({
        roleArn: process.env.AWS_ROLE_ARN!,
        clientConfig: { region: process.env.AWS_REGION },
      }),
    });

    pool = new Pool({
      host: process.env.PGHOST!,
      user: process.env.PGUSER!,
      database: process.env.PGDATABASE || "postgres",
      password: () => signer.getAuthToken(),
      port: Number(process.env.PGPORT || 5432),
      ssl: { rejectUnauthorized: false },
      max: 20,
    });

    // Vercel Functions 连接池优化（仅在 Vercel 运行时）
    if (process.env.VERCEL) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { attachDatabasePool } = require("@vercel/functions");
      attachDatabasePool(pool);
    }
  } else {
    // 本地开发环境：使用 DATABASE_URL 或标准连接
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // 如果没有 DATABASE_URL，使用单独的配置
      ...(process.env.DATABASE_URL ? {} : {
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || "postgres",
        port: Number(process.env.PGPORT || 5432),
        ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
      }),
      max: 20,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return pool;
}

/**
 * 懒加载创建 PrismaClient
 */
function createPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const pool = createPool();
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

// 使用 getter 实现懒加载
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = createPrismaClient();
    return Reflect.get(client, prop);
  },
});
