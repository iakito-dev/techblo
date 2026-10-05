import { db } from '@/db/client';
import { getHealthStatus as getHealthStatusUsecase } from '@/features/health/application/get-health-status';
import { DrizzleHealthRepository } from '@/features/health/infrastructure/drizzle-health-repository';
import { env } from '@/lib/env';

export function getHealthStatus() {
  return getHealthStatusUsecase({
    health: new DrizzleHealthRepository(db),
    requiredEnv: [
      ['DATABASE_URL', env.DATABASE_URL],
      ['BETTER_AUTH_SECRET', env.BETTER_AUTH_SECRET],
      ['BETTER_AUTH_URL', env.BETTER_AUTH_URL],
      ['GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID],
      ['GOOGLE_CLIENT_SECRET', env.GOOGLE_CLIENT_SECRET],
      ['GITHUB_CLIENT_ID', env.GITHUB_CLIENT_ID],
      ['GITHUB_CLIENT_SECRET', env.GITHUB_CLIENT_SECRET],
      ['DISCORD_CLIENT_ID', env.DISCORD_CLIENT_ID],
      ['DISCORD_CLIENT_SECRET', env.DISCORD_CLIENT_SECRET],
    ],
  });
}
