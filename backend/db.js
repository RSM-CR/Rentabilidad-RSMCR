const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'RSM_base_de_datos',
  password: String(process.env.DB_PASSWORD || '12345'),
  port: Number(process.env.DB_PORT || 5432),
});

async function probarConexion() {
  try {
    console.log('Intentando conectar a PostgreSQL...');
    const res = await pool.query('SELECT NOW()');
    console.log('¡Conexión exitosa a PostgreSQL!');
    console.log('Fecha/Hora del servidor:', res.rows[0].now);
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  }
}

if (require.main === module) {
  probarConexion();
}

module.exports = pool;