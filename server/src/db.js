import mysql from 'mysql2/promise';

export function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  // mysql://user:pass@host:port/db
  return mysql.createPool(connectionString);
}

