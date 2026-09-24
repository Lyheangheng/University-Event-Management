export default () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const jwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

  if (isProd && (!jwtSecret || jwtSecret === 'dev-secret-key-university-event-system')) {
    throw new Error(
      'CRITICAL PRODUCTION SECURITY ERROR: JWT_SECRET environment variable must be explicitly configured in production environment. Development fallback secret is strictly forbidden.',
    );
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv,
    databaseUrl: process.env.DATABASE_URL || '',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    jwtSecret: jwtSecret || 'dev-secret-key-university-event-system',
    storageProvider: process.env.STORAGE_PROVIDER || 'local',
    line: {
      channelId: process.env.LINE_CHANNEL_ID || '',
      channelSecret: process.env.LINE_CHANNEL_SECRET || '',
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
      liffId: process.env.NEXT_PUBLIC_LIFF_ID || '',
    },
  };
};
