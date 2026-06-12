//importar las dependencias necesarias
require('dotenv').config();

//importar las rutas
const routes = require('./routes/route');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

//crear una instancia de express
const app = express();

//configuración del servidor
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

function isStrongPassword(password) {
  const lengthRequirement = /.{14,}/;
  const upperRequirement = /[A-Z]/;
  const lowerRequirement = /[a-z]/;
  const numberRequirement = /[0-9]/;
  const specialRequirement = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

  return (
    lengthRequirement.test(password) &&
    upperRequirement.test(password) &&
    lowerRequirement.test(password) &&
    numberRequirement.test(password) &&
    specialRequirement.test(password)
  );
}


//aplicar las rutas
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, inténtalo de nuevo más tarde.' }
});


//aplicar middleware de seguridad
app.use(helmet());

//configurar CORS para permitir solicitudes desde el frontend
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

//parsear el cuerpo de las solicitudes como JSON
app.use(express.json());

//usar las rutas definidas
function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
}

//middleware para autenticar el token JWT
function authenticateToken(req, res, next) {

  //obtener el token del encabezado de autorización
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token no enviado' });


  //verificar el token
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

//definir las rutas
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

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message:
        'La contraseña debe tener al menos 14 caracteres, incluir letras mayúsculas, letras minúsculas, números y caracteres especiales.'
    });
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

//ruta de login para obtener el token JWT
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  //validar que se hayan enviado email y password
  if (!email || !password) {
    return res.status(400).json({ message: 'Faltan email o password' });
  }

  if (!credentialsExist()) {
    return res.status(403).json({ message: 'No hay credenciales configuradas. Usa POST /setup para crear nuevas credenciales.' });
  }

  if (credentialsExpired()) {
    return res.status(403).json({ message: 'Las credenciales han caducado. Usa POST /setup para renovarlas.' });
  }

  const passwordMatch = await bcrypt.compare(password, getPasswordHash() || '');
  const { email: validEmail } = getCredentials();

  if (email !== validEmail || !passwordMatch) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  //si las credenciales son válidas, generar un token JWT y devolverlo al cliente
  const token = generateToken({ email });
  res.json({ token });
});

//ruta protegida que requiere autenticación
app.get('/protected', authenticateToken, (req, res) => {
  //si el token es válido, devolver un mensaje de éxito y la información del usuario
  res.json({ message: 'Acceso permitido', user: req.user });
});

//usar las rutas definidas en el archivo de rutas
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/`);
});


//Para crear las credenciales usar: 
//$response = Invoke-RestMethod `
//  -Uri http://localhost:3000/setup `
//  -Method Post `
//  -ContentType "application/json" `
//  -Body '{"email":"example@rsm.cr","password":"NuevaContra123"}'
//$response

//verifica el estado de las credenciales con:
//Invoke-RestMethod `
//  -Uri http://localhost:3000/setup `
//  -Method Get

//Ingresa las credenciales para obtener el token JWT con:
//$response = Invoke-RestMethod `
//  -Uri http://localhost:3000/login `
//  -Method Post `
//  -ContentType "application/json" `
//  -Body '{"email":"example@rsm.cr","password":"NuevaContra123"}'
//$response

//Para probar la proteccion de la ruta:
//Invoke-RestMethod `
//-Uri http://localhost:3000/protected `
//-Method Get `
//-Headers @{ Authorization = "Bearer $token" }



