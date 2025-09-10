import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});
