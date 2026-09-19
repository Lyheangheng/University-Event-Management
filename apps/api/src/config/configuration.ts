export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});
