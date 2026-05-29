import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async adapter(env: Record<string, string | undefined>) {
      const connectionString = env['DATABASE_URL'];
      if (!connectionString) throw new Error('DATABASE_URL is not set');
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
