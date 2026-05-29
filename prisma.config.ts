import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load .env so DATABASE_URL is available at config-evaluation time
dotenv.config();

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL env var is required');

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  // Prisma 7: both the migrate CLI and the runtime client read from datasource.
  //   url     → used by `prisma migrate dev/deploy` (direct connection)
  //   adapter → used by PrismaClient at runtime (adapter-pg for pooled connections)
  datasource: {
    url: connectionString,
    async adapter() {
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
