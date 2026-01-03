/**
 * Vercel 构建时自动运行数据库迁移
 * 
 * 这个脚本在 Vercel 构建过程中执行，使用 OIDC 认证连接 AWS RDS
 * 并执行必要的数据库迁移
 */

import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import * as fs from "fs";
import * as path from "path";

async function runMigrations() {
  console.log("🔄 Starting database migration...");

  // 检查是否在 Vercel 环境
  if (!process.env.VERCEL) {
    console.log("⏭️  Not in Vercel environment, skipping migration");
    return;
  }

  // 检查必要的环境变量
  const requiredEnvVars = ["PGHOST", "PGUSER", "AWS_REGION", "AWS_ROLE_ARN"];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.log(`⏭️  Missing environment variables: ${missingVars.join(", ")}, skipping migration`);
    return;
  }

  try {
    // 创建 AWS RDS Signer
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

    // 创建数据库连接池
    const pool = new Pool({
      host: process.env.PGHOST!,
      user: process.env.PGUSER!,
      database: process.env.PGDATABASE || "postgres",
      password: () => signer.getAuthToken(),
      port: Number(process.env.PGPORT || 5432),
      ssl: { rejectUnauthorized: false },
    });

    console.log("📡 Connected to database");

    // 创建迁移跟踪表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    // 读取迁移文件
    const migrationsDir = path.join(process.cwd(), "prisma/migrations");
    
    if (!fs.existsSync(migrationsDir)) {
      console.log("📁 No migrations directory found, skipping");
      await pool.end();
      return;
    }

    const migrations = fs
      .readdirSync(migrationsDir)
      .filter((dir) => fs.statSync(path.join(migrationsDir, dir)).isDirectory())
      .sort();

    console.log(`📋 Found ${migrations.length} migration(s)`);

    // 获取已应用的迁移
    const { rows: appliedMigrations } = await pool.query(
      `SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`
    );
    const appliedSet = new Set(appliedMigrations.map((r) => r.migration_name));

    // 执行未应用的迁移
    for (const migration of migrations) {
      if (appliedSet.has(migration)) {
        console.log(`✅ Migration ${migration} already applied`);
        continue;
      }

      const sqlPath = path.join(migrationsDir, migration, "migration.sql");
      if (!fs.existsSync(sqlPath)) {
        console.log(`⚠️  No migration.sql found in ${migration}, skipping`);
        continue;
      }

      console.log(`🚀 Applying migration: ${migration}`);
      const sql = fs.readFileSync(sqlPath, "utf-8");
      const migrationId = crypto.randomUUID();

      try {
        // 开始事务
        await pool.query("BEGIN");

        // 记录迁移开始
        await pool.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at) 
           VALUES ($1, $2, $3, now())`,
          [migrationId, generateChecksum(sql), migration]
        );

        // 执行迁移 SQL（先移除注释行，再按分号分割执行）
        const cleanSql = sql
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n");
        
        const statements = cleanSql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          await pool.query(statement);
        }

        // 记录迁移完成
        await pool.query(
          `UPDATE "_prisma_migrations" 
           SET finished_at = now(), applied_steps_count = $1 
           WHERE id = $2`,
          [statements.length, migrationId]
        );

        await pool.query("COMMIT");
        console.log(`✅ Migration ${migration} applied successfully`);
      } catch (error) {
        await pool.query("ROLLBACK");
        console.error(`❌ Migration ${migration} failed:`, error);
        throw error;
      }
    }

    await pool.end();
    console.log("✨ Database migration completed");
  } catch (error) {
    console.error("❌ Migration error:", error);
    // 不抛出错误，避免阻止构建
    // 如果迁移失败，应用仍然可以部署，但可能会在运行时遇到问题
    console.log("⚠️  Migration failed, but continuing build...");
  }
}

function generateChecksum(content: string): string {
  // 简单的 checksum 实现
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

runMigrations();
