//importar las dependencias necesarias
const routes = require('./routes/route');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();

const port = process.env.PORT || 3000;
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const jwtSecret = process.env.JWT_SECRET;
const envPath = path.join(__dirname, '.env');
const credentialLifetimeDays = 120;

function getCredentials() {
  return {
    email: process.env.APP_USER_EMAIL,
    passwordHash: process.env.APP_USER_PASSWORD_HASH,
    password: process.env.APP_USER_PASSWORD
  };
}

function credentialsExist() {
  const { email, passwordHash, password } = getCredentials();
  return !!email && (!!passwordHash || !!password);
}

function getPasswordHash() {
  const { passwordHash, password } = getCredentials();
  if (passwordHash) return passwordHash;
  if (password) return bcrypt.hashSync(password, 10);
  return null;
}

function getCredentialsCreatedAt() {
  return process.env.CREDENTIALS_CREATED_AT
    ? new Date(process.env.CREDENTIALS_CREATED_AT)
    : null;
}

function credentialsExpired() {
  if (!credentialsExist()) return false;
  const createdAt = getCredentialsCreatedAt();
  if (!createdAt) return true;
  const ageMs = Date.now() - createdAt.getTime();
  return ageMs > credentialLifetimeDays * 24 * 60 * 60 * 1000;
}

function saveEnvVariables(values) {
  const current = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    : [];

  const updatedLines = current.map((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) return line;
    const key = match[1];
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return `${key}=${values[key]}`;
    }
    return line;
  });

  Object.keys(values).forEach((key) => {
    if (!updatedLines.some((line) => line.startsWith(`${key}=`))) {
      updatedLines.push(`${key}=${values[key]}`);
    }
  });

  fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
  Object.assign(process.env, values);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, inténtalo de nuevo más tarde.' }
});

app.use(helmet());
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// montar las rutas de la API para carga de archivos
app.use('/api', routes);

function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token no enviado' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.post('/setup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Faltan email o password para configurar las credenciales' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Email no válido' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  if (credentialsExist() && !credentialsExpired()) {
    return res.status(400).json({ message: 'Las credenciales ya están configuradas y aún no han caducado' });
  }

  const newPasswordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  saveEnvVariables({
    APP_USER_EMAIL: email,
    APP_USER_PASSWORD_HASH: newPasswordHash,
    CREDENTIALS_CREATED_AT: createdAt
  });

  return res.json({
    message: 'Credenciales guardadas',
    expiresInDays: credentialLifetimeDays,
    createdAt
  });
});

app.get('/setup', (req, res) => {
  if (!credentialsExist()) {
    return res.json({
      setupRequired: true,
      message: 'No hay credenciales configuradas. Usa POST /setup para agregarlas.'
    });
  }

  if (credentialsExpired()) {
    return res.json({
      setupRequired: true,
      message: 'Las credenciales han caducado. Usa POST /setup para renovarlas.',
      createdAt: process.env.CREDENTIALS_CREATED_AT
    });
  }

  const createdAt = getCredentialsCreatedAt();
  const expiresAt = new Date(createdAt.getTime() + credentialLifetimeDays * 24 * 60 * 60 * 1000);

  return res.json({
    setupRequired: false,
    expiresAt: expiresAt.toISOString(),
    createdAt: process.env.CREDENTIALS_CREATED_AT
  });
});

app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Faltan email o password' });
  }

  //comparar las credenciales con las almacenadas en las variables de entorno
  const passwordMatch = passwordHash
    ? await bcrypt.compare(password, passwordHash)
    : false;

  //si las credenciales no son válidas, devolver un error
  if (email !== validEmail || !passwordMatch) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const token = generateToken({ email });
  res.json({ token });
});

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/`);
});