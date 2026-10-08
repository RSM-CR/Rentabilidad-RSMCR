const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const jwtSecret = process.env.JWT_SECRET || 'secret-key-default';

// Busca un usuario por email en PostgreSQL y devuelve su rol principal.
async function findUserByEmail(email) {
  const query = `
    SELECT
      u.user_id,
      u.nombre,
      u.email,
      u.password,
      u.puesto,
      u.departamento,
      u.active_session,
      COALESCE(string_agg(DISTINCT r.nombre, ','), '') AS roles
    FROM usuarios u
    LEFT JOIN user_role ur ON u.user_id = ur.user_id
    LEFT JOIN role r ON ur.role_id = r.role_id
    WHERE lower(u.email) = lower($1)
    GROUP BY u.user_id
  `;

  const { rows } = await pool.query(query, [email]);

  if (!rows.length) return null;

  const row = rows[0];
  const roles = row.roles ? row.roles.split(',').filter(Boolean) : [];

  return {
    id: row.user_id,
    nombre: row.nombre,
    email: row.email,
    passwordHash: row.password,
    puesto: row.puesto,
    departamento: row.departamento,
    activeSession: row.active_session,
    role: roles[0] || 'user',
    roles
  };
}

// Genera el JWT que usa la app para autenticar al usuario.
function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: '1h',
    issuer: 'rentabilidad-rsmcr',
    audience: 'frontend'
  });
}

// Login principal: valida admin o usuario normal según la base de datos.
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Faltan email o password' });
    }

    // Validación del administrador configurado en variables de entorno.
    const adminEmail = process.env.APP_USER_EMAIL;
    if (email.toLowerCase() === (adminEmail || '').toLowerCase()) {
      const rawHash = process.env.APP_USER_PASSWORD_HASH || null;
      const passwordFromEnv = process.env.APP_USER_PASSWORD || null;
      const validHash = rawHash || (passwordFromEnv ? bcrypt.hashSync(passwordFromEnv, 10) : null);

      if (!validHash) {
        return res.status(403).json({ message: 'No hay credenciales configuradas para el administrador' });
      }

      const passwordMatches = await bcrypt.compare(password, validHash);
      if (!passwordMatches) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const token = generateToken({ email, role: 'admin' });
      return res.json({ token, role: 'admin' });
    }

    // Si no es admin, busca al usuario en PostgreSQL.
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Genera una sesión y la guarda en la DB para controlar sesiones activas.
    const sessionId = crypto.randomBytes(16).toString('hex');
    await pool.query(
      'UPDATE usuarios SET active_session = $1, ultimo_login = NOW() WHERE lower(email) = lower($2)',
      [sessionId, email]
    );

    const token = generateToken({ email: user.email, role: user.role, sessionId });

    return res.json({
      token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        puesto: user.puesto,
        departamento: user.departamento,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ message: 'Error interno al autenticar' });
  }
}

// Devuelve la información del usuario autenticado.
async function getMe(req, res) {
  try {
    if (req.user.email === process.env.APP_USER_EMAIL) {
      return res.json({
        email: req.user.email,
        role: 'admin',
        isAdmin: true,
        filter: null
      });
    }

    const user = await findUserByEmail(req.user.email);

    return res.json({
      email: user ? user.email : req.user.email,
      role: user ? user.role : 'user',
      isAdmin: false,
      filter: user ? user.departamento || null : null
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ message: 'Error interno al obtener información del usuario' });
  }
}

module.exports = {
  login,
  getMe
};