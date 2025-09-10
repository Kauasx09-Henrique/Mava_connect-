// CÓDIGO CORRIGIDO ✅
import pkg from 'pg';
const { Pool } = pkg;

// Define a configuração do SSL com base no ambiente
const sslConfig = process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: false } 
  : undefined;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});