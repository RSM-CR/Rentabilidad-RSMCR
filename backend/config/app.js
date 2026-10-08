const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Dependencias principales de la app
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

// Rutas que monta la app
const analysisRoutes = require('../routes/Analisis_router');
const authRoutes = require('../routes/Auth_router');
const userRoutes = require('../routes/user_router');

// Crea la instancia de Express.
// Aquí es donde se define la aplicación principal.
const app = express();

// Orígenes permitidos por CORS para el frontend local.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000'
];

// Configuración de CORS para aceptar peticiones del frontend.
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Seguridad básica del servidor.
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Permite recibir JSON en las peticiones.
app.use(express.json({ limit: '1mb' }));

// Ruta raíz del backend y health check para verificar que la app responde.
app.get('/api', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

// Monta los endpoints de autenticación, usuarios y análisis.
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', analysisRoutes);

// Si existe el build del frontend, lo sirve como archivos estáticos.
const frontendPath = path.join(__dirname, '../../rentabilidad/build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Manejo de errores para JSON malformado.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Bad JSON:', err);
    return res.status(400).json({ message: 'JSON inválido' });
  }
  next(err);
});

// Error global del servidor.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor'
  });
});

// Captura promesas no manejadas para no romper la app de forma silenciosa.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Si algo rompe todo, cierra el proceso para detectar el problema.
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
