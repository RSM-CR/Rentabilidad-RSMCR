//importar las dependencias necesarias
const routes = require('./routes/route');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const app = express();

const port = process.env.PORT || 3000;
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const validEmail = process.env.APP_USER_EMAIL;
const validPassword = process.env.APP_USER_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;
const passwordHash = validPassword ? bcrypt.hashSync(validPassword, 10) : null;

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

app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Faltan email o password' });
  }

  const passwordMatch = passwordHash
    ? await bcrypt.compare(password, passwordHash)
    : false;

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