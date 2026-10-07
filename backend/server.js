
// Cargar variables de entorno desde .env
const path = require('path');
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
// Pool de PostgreSQL (DB local)
const pool = require('./db');

const crypto = require('crypto');

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}
// Importar dependencias de seguridad y utilidades
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const util = require('util');
  
// Rutas personalizadas para cargar archivos
const routes = require('./routes/Analisis_route');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GENERAL DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
   origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no permitido'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

const jwtSecret = process.env.JWT_SECRET || 'secret-key-default';
const credentialLifetimeDays = 120; // Credenciales válidas por 120 días

// Manejar errores de JSON malformado (body parser)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Bad JSON:', err);
    return res.status(400).json({ message: 'JSON inválido' });
  }
  next(err);
});

// Middleware central de manejo de errores
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

// Capturas globales para rechazos y excepciones no manejadas
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // En entornos production podría reiniciarse el proceso
  process.exit(1);
});

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {

  // Limpiar usuarios expirados al iniciar
  removeExpiredUsers();

  // Revisar cada hora
  setInterval(
    removeExpiredUsers,
    60 * 60 * 1000
  );

  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/`);
  });
}