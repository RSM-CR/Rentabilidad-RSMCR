
// Cargar variables de entorno desde .env
const path = require('path');
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
const mysql = require('mysql2');
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
let envSaving = false;

function saveEnvVariables(values) {
    if (envSaving) {

      return;

  }

  envSaving = true;
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
  } finally {

      envSaving = false;

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
const USER_EXPIRATION_HOURS = 12;

if (!process.env.USER_DATA_KEY) {

    throw new Error(
        'USER_DATA_KEY no está definida en el .env'
    );

}

const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.USER_DATA_KEY)
  .digest();

function encryptEmail(email) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    ENCRYPTION_KEY,
    iv
  );

  let encrypted = cipher.update(
    email,
    'utf8',
    'hex'
  );

  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptEmail(encryptedEmail) {
  const [ivHex, encrypted] =
    encryptedEmail.split(':');

  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    ENCRYPTION_KEY,
    iv
  );

  let decrypted = decipher.update(
    encrypted,
    'hex',
    'utf8'
  );

  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Carga todos los usuarios del archivo users.json
 * @returns {Array} Array de usuarios o [] si no existe el archivo
 */
function loadUsers() {
  // Fallback a archivo JSON si la base de datos no está disponible.
  try {
    if (!fs.existsSync(usersPath)) {
      return [];
    }

    const data = fs.readFileSync(usersPath, 'utf8');

    let users;

    try {
      users = JSON.parse(data);
    } catch (parseErr) {
      console.error('Error parsing users.json:', parseErr);
      return [];
    }

    const now = Date.now();
    const expirationMs = USER_EXPIRATION_HOURS * 60 * 60 * 1000;

    const validUsers = users.filter(user => {
      if (!user.createdAt) {
        return false;
      }

      const createdAt = new Date(user.createdAt).getTime();

      return (now - createdAt) < expirationMs;
    });

    // Si se eliminaron usuarios expirados, guardar cambios
    if (validUsers.length !== users.length) {
      saveUsers(validUsers);

      console.log(
        `Usuarios expirados eliminados automáticamente: ${
          users.length - validUsers.length
        }`
      );
    }

    return validUsers;
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
    const tempPath = `${usersPath}.tmp`;

    fs.writeFileSync(
      tempPath,
      JSON.stringify(users, null, 2),
      'utf8'
    );

    fs.renameSync(tempPath, usersPath);
  } catch (err) {
    console.error('Error saving users.json:', err);
    throw new Error('Error interno al guardar usuarios');
  }
}

// ================= DB-backed user helpers =================
async function ensureActiveSessionColumn() {
  try {
    await pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS active_session TEXT;");
  } catch (err) {
    // no fatal
    console.warn('No se pudo asegurar columna active_session:', err.message);
  }
}

async function dbGetUserByEmail(email) {
  try {
    await ensureActiveSessionColumn();
    const q = `SELECT u.user_id, u.nombre, u.email, u.password as passwordhash, u.fecha_creacion, u.ultimo_login, u.puesto, u.departamento, u.active_session,
                COALESCE(string_agg(r.nombre, ','), '') as roles
               FROM usuarios u
               LEFT JOIN user_role ur ON u.user_id = ur.user_id
               LEFT JOIN role r ON ur.role_id = r.role_id
               WHERE lower(u.email) = lower($1)
               GROUP BY u.user_id`;

    const res = await pool.query(q, [email]);
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    const roles = row.roles ? row.roles.split(',').filter(Boolean) : [];

    return {
      id: row.user_id,
      nombre: row.nombre,
      email: row.email,
      passwordHash: row.passwordhash,
      createdAt: row.fecha_creacion,
      ultimoLogin: row.ultimo_login,
      puesto: row.puesto,
      filter: row.departamento,
      activeSession: row.active_session,
      role: roles.length ? roles[0] : 'user',
      roles
    };
  } catch (err) {
    console.error('dbGetUserByEmail error:', err.message);
    return null;
  }
}

async function dbAddUser(email, passwordHash, role = 'user', filter = null, nombre = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertUserText = `INSERT INTO usuarios (nombre, email, password, puesto, departamento)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
      RETURNING user_id`;

    const nombreVal = nombre || email.split('@')[0];
    const res = await client.query(insertUserText, [nombreVal, email, passwordHash, role, filter]);

    const userId = res.rowCount ? res.rows[0].user_id : null;

    // Asegurar rol existe
    const roleRes = await client.query('SELECT role_id FROM role WHERE lower(nombre)=lower($1)', [role]);
    let roleId;
    if (roleRes.rowCount === 0) {
      const ins = await client.query('INSERT INTO role (nombre) VALUES ($1) RETURNING role_id', [role]);
      roleId = ins.rows[0].role_id;
    } else {
      roleId = roleRes.rows[0].role_id;
    }

    if (userId) {
      await client.query('INSERT INTO user_role (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId]);
    }

    await client.query('COMMIT');

    return { success: true, message: 'Usuario agregado correctamente' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('dbAddUser error:', err.message);
    return { success: false, message: 'Error al insertar usuario en DB' };
  } finally {
    client.release();
  }
}

async function dbSetActiveSession(email, sessionId) {
  try {
    await ensureActiveSessionColumn();
    await pool.query('UPDATE usuarios SET active_session=$1, ultimo_login=NOW() WHERE lower(email)=lower($2)', [sessionId, email]);
    return true;
  } catch (err) {
    console.error('dbSetActiveSession error:', err.message);
    return false;
  }
}

async function dbClearActiveSession(email) {
  try {
    await ensureActiveSessionColumn();
    await pool.query('UPDATE usuarios SET active_session=NULL WHERE lower(email)=lower($1)', [email]);
    return true;
  } catch (err) {
    console.error('dbClearActiveSession error:', err.message);
    return false;
  }
}

async function dbListUsers() {
  try {
    const q = `SELECT u.user_id, u.nombre, u.email, u.fecha_creacion, u.puesto, u.departamento,
                COALESCE(string_agg(r.nombre, ','), '') as roles
               FROM usuarios u
               LEFT JOIN user_role ur ON u.user_id = ur.user_id
               LEFT JOIN role r ON ur.role_id = r.role_id
               GROUP BY u.user_id`;
    const res = await pool.query(q);
    return res.rows.map(r => ({
      email: r.email,
      role: r.roles ? r.roles.split(',')[0] : 'user',
      filter: r.departamento || null,
      createdAt: r.fecha_creacion
    }));
  } catch (err) {
    console.error('dbListUsers error:', err.message);
    return [];
  }
}

 function removeExpiredUsers() {
 

    try {
      const users = loadUsers();

      const now = Date.now();
      const expirationMs = USER_EXPIRATION_HOURS * 60 * 60 * 1000;

      const validUsers = users.filter(user => {
        if (!user.createdAt) {
          return false;
        }

        const createdAt = new Date(user.createdAt).getTime();

        return (now - createdAt) < expirationMs;
      });

      if (validUsers.length !== users.length) {
        saveUsers(validUsers);

        console.log(
          `Se eliminaron ${
            users.length - validUsers.length
          } usuarios expirados`
        );
      }
    } catch (err) {
      console.error('Error eliminando usuarios expirados:', err);
    }
}

/**
 * Busca un usuario por su email
 * @param {String} email - Email del usuario
 * @returns {Object|undefined} Usuario encontrado o undefined
 */
function getUserByEmail(email) {

  const normalizedEmail =
    email.trim().toLowerCase();

  const users = loadUsers();

  return users.find(user => {
    try {
      return (
        decryptEmail(user.email) ===
        normalizedEmail
      );
    } catch {
      return false;
    }
  });
}

/**
 * Agrega un nuevo usuario a la base de datos
 * @param {String} email - Email único del usuario
 * @param {String} passwordHash - Hash bcryptjs de la contraseña
 * @param {String} role - Rol del usuario (user, editor, viewer)
 * @returns {Object} { success: boolean, message: string }
 */
function addUser(email, passwordHash, role = 'user', filter = null) {

  const normalizedEmail =
    email.trim().toLowerCase();

  const users = loadUsers();

  // Verificar si el usuario ya existe
  const userExists = users.some(user => {
    try {
      return (
        decryptEmail(user.email) ===
        normalizedEmail
      );
    } catch (err) {
      console.error(
        'Error descifrando email:',
        err
      );
      return false;
    }
  });

  if (userExists) {
    return {
      success: false,
      message: 'El usuario ya existe'
    };
  }

  users.push({
    email: encryptEmail(normalizedEmail),
    passwordHash,
    role,
    filter,
    createdAt: new Date().toISOString(),
    activeSession: null
  });

  saveUsers(users);

  return {
    success: true,
    message: 'Usuario agregado correctamente'
  };
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

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiadas solicitudes administrativas.'
  }
});

// Configurar seguridad con Helmet (protege contra XSS, clickjacking, etc.)
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);



// Parsear JSON en el body de las requests
app.use(express.json({
  limit: '1mb'
}));

// Montar rutas personalizadas para carga de archivos
app.use('/api', routes);

const frontendPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendPath)) {

    app.use(express.static(frontendPath));

}

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
  return jwt.sign(payload, jwtSecret, { 
    expiresIn: '1h',
    issuer: 'rentabilidad-rsmcr',
    audience: 'frontend' });
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

  jwt.verify(token, jwtSecret, async (err, user) => {

  if (err) {
    return res.status(403).json({
      message: 'Token inválido'
    });
  }

  // Ignorar admins
  if (user.role !== 'admin') {
    try {
      const dbUser = await dbGetUserByEmail(user.email);

      if (!dbUser) {
        return res.status(403).json({ message: 'Usuario eliminado' });
      }

      if (dbUser.activeSession !== user.sessionId) {
        return res.status(403).json({ message: 'Sesión inválida o reemplazada' });
      }
    } catch (err) {
      console.error('authenticateToken db error:', err.message);
      return res.status(500).json({ message: 'Error interno' });
    }
  }

  req.user = user;
  next();
});
}



// ═══════════════════════════════════════════════════════════════════════════
// RUTAS DE API
// ═══════════════════════════════════════════════════════════════════════════


app.get('/api/', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});


app.post('/api/setup', adminLimiter, async (req, res) => {
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
app.get('/api/setup', (req, res) => {
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
app.post('/api/login', loginLimiter, async (req, res) => {
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

    // Verificar contra usuarios normales (Postgres)
    const user = await dbGetUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Detectar segunda sesión
    if (user.activeSession) {
      return res.status(403).json({ message: 'Ya existe una sesión activa para este usuario' });
    }

    const sessionId = generateSessionId();

    const setOk = await dbSetActiveSession(email, sessionId);

    const token = generateToken({ email, role: user.role, sessionId });

    res.json({ token, role: user.role });
    
  } catch (err) {
    console.error('POST /login error:', err);
    return res.status(500).json({ message: 'Error interno al autenticar' });
  }
});

app.post(
  '/api/logout',
  authenticateToken,
  (req, res) => {

    if (req.user.role === 'admin') {
      return res.json({
        message: 'Logout exitoso'
      });
    }
    // Limpiar sesión activa en DB
    (async () => {
      try {
        await dbClearActiveSession(req.user.email);
      } catch (err) {
        console.error('Error clearing session on logout:', err.message);
      }
    })();

    return res.json({ message: 'Logout exitoso' });
  }
);


app.post('/api/users',adminLimiter, authenticateToken, authorizeAdmin, async (req, res) => {
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
    const result = await dbAddUser(email, passwordHash, userRole, filter);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({ message: result.message, user: { email, role: userRole } });
  } catch (err) {
    console.error('POST /users error:', err);
    return res.status(500).json({ message: 'Error interno al crear usuario' });
  }
});


app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const adminEmail = process.env.APP_USER_EMAIL;
    const userList = await dbListUsers();
    return res.json({ admin: adminEmail, users: userList, totalUsers: userList.length });
  } catch (err) {
    console.error('GET /users error:', err);
    return res.status(500).json({ message: 'Error interno al listar usuarios' });
  }
});


app.delete( '/api/users/:email', adminLimiter, authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const emailToDelete = req.params.email;

    if (!isValidEmail(emailToDelete)) {
      return res.status(400).json({
        message: 'Email inválido'
      });
    }

    if (emailToDelete === process.env.APP_USER_EMAIL) {
      return res.status(403).json({ message: 'No se puede eliminar al administrador' });
    }

    let users = loadUsers();
    const initialLength = users.length;
    users = users.filter(user => {
      try {
        return (
          decryptEmail(user.email) !==
          emailToDelete.toLowerCase()
        );
      } catch {
        return true;
      }
    });

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


app.get('/protected', authenticateToken, (req, res) => {
  try {
    return res.json({ message: 'Acceso permitido', user: req.user });
  } catch (err) {
    console.error('GET /protected error:', err);
    return res.status(500).json({ message: 'Error interno' });
  }
});


app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    // Si es admin, no tiene filter
    if (isAdministrator(req.user.email)) {
      return res.json({ email: req.user.email, role: req.user.role, isAdmin: true, filter: null });
    }

    // Para usuarios normales, buscar su filtro en la DB
    const user = await dbGetUserByEmail(req.user.email);
    return res.json({ email: req.user.email, role: req.user.role, isAdmin: false, filter: user ? user.filter || null : null });
  } catch (err) {
    console.error('GET /me error:', err);
    return res.status(500).json({ message: 'Error interno al obtener información del usuario' });
  }
});

if (fs.existsSync(frontendPath)) {

    app.get('*', (req, res) => {

        res.sendFile(
            path.join(frontendPath, 'index.html')
        );

    });

}

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


function deleteUserByEmail(email) {
  let users = loadUsers();

  users = users.filter(user => {
    try {
      return decryptEmail(user.email) !== email;
    } catch {
      return true;
    }
  });

  saveUsers(users);
}

