const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const UserModel = require('../model/user_model');
const authMiddleware = require('../middleware/Auth_middleware');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Verificar si el usuario existe
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // 2. Verificar la contraseña con bcrypt
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // 3. Registrar el inicio de sesión
    await UserModel.updateLastLogin(user.user_id);

    // 4. Generar el Token JWT con la información del usuario, roles y privilegios
    const token = jwt.sign(
      {
        id: user.user_id,
        nombre: user.nombre,
        email: user.email,
        departamento: user.departamento,
        puesto: user.puesto,
        roles: user.roles || [],
        privileges: user.privilegios || []
      },
      process.env.JWT_SECRET || 'secreto_super_seguro',
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.user_id,
        nombre: user.nombre,
        email: user.email,
        puesto: user.puesto,
        departamento: user.departamento,
        roles: user.roles || [],
        privilegios: user.privilegios || []
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * POST /setup - Configura las credenciales del administrador
 * 
 * Respuesta:   
 * 
 *  
 */
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


module.exports = {
  login
};