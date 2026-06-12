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

//crear una instancia de express
const app = express();

//configuración del servidor
const port = process.env.PORT || 3000;
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const validEmail = process.env.APP_USER_EMAIL;
const validPassword = process.env.APP_USER_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;
const passwordHash = validPassword ? bcrypt.hashSync(validPassword, 10) : null;


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

//ruta de login para obtener el token JWT
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  //validar que se hayan enviado email y password
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


//Para probar las credenciales usar: 
//$response = Invoke-RestMethod `
//-Uri http://localhost:3000/login `
//-Method Post `
//-ContentType "application/json" `
//-Body '{"email":"example@rsm.cr","password":"123456RSMexaples"}'
//$response

//Para probar la proteccion de la ruta:
//Invoke-RestMethod `
//-Uri http://localhost:3000/protected `
//-Method Get `
//-Headers @{ Authorization = "Bearer $token" }
