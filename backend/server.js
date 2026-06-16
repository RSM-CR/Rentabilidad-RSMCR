
// Cargar variables de entorno desde .env
require('dotenv').config();

// Importar dependencias de seguridad y utilidades
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Rutas personalizadas para cargar archivos
const routes = require('./routes/route');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GENERAL DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const jwtSecret = process.env.JWT_SECRET || 'secret-key-default';
const envPath = path.join(__dirname, '.env');
const credentialLifetimeDays = 120; // Credenciales válidas por 120 días

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE GESTIÓN DE CREDENCIALES DEL ADMINISTRADOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene las credenciales del administrador desde variables de entorno
 * @returns {Object} { email, passwordHash, password }
 */
function getCredentials() {
  return {
    email: process.env.APP_USER_EMAIL,
    passwordHash: process.env.APP_USER_PASSWORD_HASH,
    password: process.env.APP_USER_PASSWORD
  };
}

/**
 * Verifica si las credenciales del admin ya están configuradas
 * @returns {Boolean} true si existe email y (passwordHash o password)
 */
function credentialsExist() {
  const { email, passwordHash, password } = getCredentials();
  return !!email && (!!passwordHash || !!password);
}

/**
 * Obtiene el hash de contraseña válido desde .env
 * Prioriza passwordHash sobre password
 * @returns {String|null} Hash bcrypt o null si no existe
 */
function getPasswordHash() {
  const { passwordHash, password } = getCredentials();
  if (passwordHash) return passwordHash;
  if (password) return bcrypt.hashSync(password, 10);
  return null;
}

/**
 * Obtiene la fecha de creación de las credenciales del admin
 * @returns {Date|null} Fecha ISO de creación o null
 */
function getCredentialsCreatedAt() {
  return process.env.CREDENTIALS_CREATED_AT
    ? new Date(process.env.CREDENTIALS_CREATED_AT)
    : null;
}

/**
 * Verifica si las credenciales han expirado (después de 120 días)
 * @returns {Boolean} true si han expirado, false si siguen válidas
 */
function credentialsExpired() {
  if (!credentialsExist()) return false;
  const createdAt = getCredentialsCreatedAt();
  if (!createdAt) return true;
  const ageMs = Date.now() - createdAt.getTime();
  
  return ageMs > credentialLifetimeDays * 24 * 60 * 60 * 1000;
}

/**
 * Guarda o actualiza variables en el archivo .env
 * @param {Object} values - { KEY: 'value' } a guardar
 */
function saveEnvVariables(values) {
  try {
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
  } catch (err) {
    console.error('Error saving .env variables:', err);
    throw new Error('Error interno al guardar variables de entorno');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida que el email tenga formato correcto
 * @param {String} email - Email a validar
 * @returns {Boolean} true si es válido
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida que la contraseña sea fuerte:
 * - Mínimo 14 caracteres
 * - Al menos 1 mayúscula
 * - Al menos 1 minúscula
 * - Al menos 1 número
 * - Al menos 1 carácter especial (!@#$%^&*...)
 * @param {String} password - Contraseña a validar
 * @returns {Boolean} true si cumple todos los requisitos
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE GESTIÓN DE USUARIOS Y ROLES
// ═══════════════════════════════════════════════════════════════════════════

const usersPath = path.join(__dirname, 'users.json');

/**
 * Carga todos los usuarios del archivo users.json
 * @returns {Array} Array de usuarios o [] si no existe el archivo
 */
function loadUsers() {
  try {
    if (fs.existsSync(usersPath)) {
      const data = fs.readFileSync(usersPath, 'utf8');
      try {
        return JSON.parse(data);
      } catch (parseErr) {
        console.error('Error parsing users.json:', parseErr);
        // If file is corrupted, return empty list to avoid crashing
        return [];
      }
    }
    return [];
  } catch (err) {
    console.error('Error loading users:', err);
    return [];
  }
}

/**
 * Guarda todos los usuarios en el archivo users.json
 * @param {Array} users - Array de usuarios a guardar
 */
function saveUsers(users) {
  try {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving users.json:', err);
    throw new Error('Error interno al guardar usuarios');
  }
}

/**
 * Busca un usuario por su email
 * @param {String} email - Email del usuario
 * @returns {Object|undefined} Usuario encontrado o undefined
 */
function getUserByEmail(email) {
  const users = loadUsers();
  return users.find((user) => user.email === email);
}

/**
 * Agrega un nuevo usuario a la base de datos
 * @param {String} email - Email único del usuario
 * @param {String} passwordHash - Hash bcryptjs de la contraseña
 * @param {String} role - Rol del usuario (user, editor, viewer)
 * @returns {Object} { success: boolean, message: string }
 */
function addUser(email, passwordHash, role = 'user', filter = null) {
  const users = loadUsers();
  if (users.some((user) => user.email === email)) {
    return { success: false, message: 'El usuario ya existe' };
  }
  users.push({
    email,
    passwordHash,
    role,
    filter,
    createdAt: new Date().toISOString()
  });
  try {
    saveUsers(users);
    return { success: true, message: 'Usuario creado exitosamente' };
  } catch (err) {
    console.error('addUser error:', err);
    return { success: false, message: 'No se pudo guardar el usuario' };
  }
}

/**
 * Verifica si un email pertenece al administrador
 * @param {String} email - Email a verificar
 * @returns {Boolean} true si es el admin (APP_USER_EMAIL)
 */
function isAdministrator(email) {
  const adminEmail = process.env.APP_USER_EMAIL;
  return email === adminEmail;
}


// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE MIDDLEWARE Y SEGURIDAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rate limiter para prevenir ataques de fuerza bruta en login
 * Máximo 5 intentos por 15 minutos
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, inténtalo de nuevo más tarde.' }
});

// Configurar seguridad con Helmet (protege contra XSS, clickjacking, etc.)
app.use(helmet());

// Configurar CORS para permitir solo ciertos orígenes
app.use(cors({
  origin: allowedOrigin, // Solo localhost:3000 o URL especificada en .env
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Parsear JSON en el body de las requests
app.use(express.json());

// Montar rutas personalizadas para carga de archivos
app.use('/api', routes);

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE AUTENTICACIÓN Y AUTORIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera un JWT con la información del usuario
 * El token expira en 1 hora
 * @param {Object} payload - { email, role }
 * @returns {String} Token JWT
 */
function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
}

/**
 * Middleware: Verifica que el usuario sea administrador
 * Retorna 403 Forbidden si no es admin
 */
function authorizeAdmin(req, res, next) {
  if (!req.user || !isAdministrator(req.user.email)) {
    return res.status(403).json({ message: 'Acceso denegado. Solo administradores pueden acceder.' });
  }
  next();
}

/**
 * Middleware: Verifica que el JWT sea válido
 * Extrae el token del header Authorization: Bearer <token>
 * Si es válido, carga req.user con { email, role }
 */
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



// ═══════════════════════════════════════════════════════════════════════════
// RUTAS DE API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET / - Ruta de prueba
 * Verifica que el servidor está funcionando
 */
app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

/**
 * POST /setup - Configura las credenciales del administrador
 * Primera vez: crea nuevas credenciales
 * Posterior: solo permite renovación si ya expiraron (120 días)
 * 
 * Body: { email, password }
 * Valida: email válido, contraseña fuerte
 * Respuesta: { message, expiresInDays, createdAt }
 */
app.post('/setup', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('POST /setup error:', err);
    return res.status(500).json({ message: 'Error interno al configurar credenciales' });
  }
});

/**
 * GET /setup - Verifica el estado de las credenciales del admin
 * 
 * Respuesta:
 * { setupRequired: true, message: "..." } - No configuradas o expiradas
 * { setupRequired: false, expiresAt: "...", createdAt: "..." } - Válidas
 */
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

/**
 * POST /login - Autentica usuario y retorna JWT
 * Valida contra:
 * 1. Admin (credenciales del .env)
 * 2. Usuarios normales (users.json)
 * 
 * Body: { email, password }
 * Rate limit: 5 intentos por 15 minutos
 * Respuesta: { token, role } - JWT de 1 hora
 */
app.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Faltan email o password' });
    }

    if (!credentialsExist()) {
      return res.status(403).json({ message: 'No hay credenciales configuradas. Usa POST /setup para crear nuevas credenciales.' });
    }

    // Verificar contra administrador
    const adminEmail = process.env.APP_USER_EMAIL;
    if (email === adminEmail) {
      if (credentialsExpired()) {
        return res.status(403).json({ message: 'Las credenciales han caducado. Usa POST /setup para renovarlas.' });
      }

      const passwordMatch = await bcrypt.compare(password, getPasswordHash() || '');
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const token = generateToken({ email, role: 'admin' });
      return res.json({ token, role: 'admin' });
    }

    // Verificar contra usuarios normales
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken({ email, role: user.role });
    res.json({ token, role: user.role });
  } catch (err) {
    console.error('POST /login error:', err);
    return res.status(500).json({ message: 'Error interno al autenticar' });
  }
});

/**
 * POST /users - Crear nuevo usuario (SOLO ADMIN)
 * Requiere: JWT válido + rol admin
 * 
 * Body: { email, password, role? }
 * Roles válidos: 'user' (default), 'editor', 'viewer'
 * Valida: email único, contraseña fuerte
 * Respuesta: { message, user: { email, role } }
 */
app.post('/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { email, password, role, filter } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Faltan email o password' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email no válido' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 14 caracteres, incluir letras mayúsculas, letras minúsculas, números y caracteres especiales.'
      });
    }

  const validRoles = ['user', 'editor', 'viewer'];
  const validFilters = [
    'Auditoria',
    'Auditoria de TI y Cumplimiento Normativo',
    'BPO',
    'Finanzas corporativas',
    'Impuestos',
    'Precios de Transferencia',
    'RAS',
    'Consultoria de Negocios',
    'Ti - Consultoria',
    'TI - Administracion',
    'Administracion',
    'Recursos Humanos',
    'Desarrollo de Negocios'
  ];

  const userRole = validRoles.includes(role) ? role : 'user';

  // Validar filter: debe estar presente y ser uno solo de la lista permitida
  if (!filter || typeof filter !== 'string' || !validFilters.includes(filter)) {
    return res.status(400).json({ message: 'Debes asignar exactamente un filtro válido al usuario.' });
  }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = addUser(email, passwordHash, userRole, filter);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      message: result.message,
      user: { email, role: userRole }
    });
  } catch (err) {
    console.error('POST /users error:', err);
    return res.status(500).json({ message: 'Error interno al crear usuario' });
  }
});

/**
 * GET /users - Listar todos los usuarios (SOLO ADMIN)
 * Requiere: JWT válido + rol admin
 * 
 * Respuesta: { admin, users, totalUsers }
 */
app.get('/users', authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const users = loadUsers();
    const adminEmail = process.env.APP_USER_EMAIL;
    const userList = users.map((user) => ({
      email: user.email,
      role: user.role,
      filter: user.filter || null,
      createdAt: user.createdAt
    }));

    return res.json({
      admin: adminEmail,
      users: userList,
      totalUsers: users.length
    });
  } catch (err) {
    console.error('GET /users error:', err);
    return res.status(500).json({ message: 'Error interno al listar usuarios' });
  }
});

/**
 * DELETE /users/:email - Eliminar usuario (SOLO ADMIN)
 * Requiere: JWT válido + rol admin
 * No permite eliminar al admin
 * 
 * Respuesta: { message }
 */
app.delete('/users/:email', authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const emailToDelete = req.params.email;

    if (emailToDelete === process.env.APP_USER_EMAIL) {
      return res.status(403).json({ message: 'No se puede eliminar al administrador' });
    }

    let users = loadUsers();
    const initialLength = users.length;
    users = users.filter((user) => user.email !== emailToDelete);

    if (users.length === initialLength) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    try {
      saveUsers(users);
    } catch (err) {
      console.error('Error saving users on delete:', err);
      return res.status(500).json({ message: 'Error interno al eliminar usuario' });
    }

    return res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    console.error('DELETE /users/:email error:', err);
    return res.status(500).json({ message: 'Error interno al eliminar usuario' });
  }
});

/**
 * GET /protected - Ruta protegida de prueba
 * Requiere: JWT válido
 * 
 * Respuesta: { message, user: { email, role } }
 */
app.get('/protected', authenticateToken, (req, res) => {
  try {
    return res.json({ message: 'Acceso permitido', user: req.user });
  } catch (err) {
    console.error('GET /protected error:', err);
    return res.status(500).json({ message: 'Error interno' });
  }
});

/**
 * GET /me - Obtener información del usuario autenticado
 * Requiere: JWT válido
 * 
 * Respuesta: { email, role, isAdmin }
 */


app.get('/me', authenticateToken, (req, res) => {
  try {
    // Si es admin, no tiene filter
    if (isAdministrator(req.user.email)) {
      return res.json({
        email: req.user.email,
        role: req.user.role,
        isAdmin: true,
        filter: null
      });
    }

    // Para usuarios normales, buscar su filtro en users.json
    const user = getUserByEmail(req.user.email);
    return res.json({
      email: req.user.email,
      role: req.user.role,
      isAdmin: false,
      filter: user ? user.filter || null : null
    });
  } catch (err) {
    console.error('GET /me error:', err);
    return res.status(500).json({ message: 'Error interno al obtener información del usuario' });
  }
});

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
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/`);
  });
}



