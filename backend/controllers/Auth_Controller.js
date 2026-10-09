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
      u.departamento,
      u.ultimo_login,
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
    departamento: row.departamento,
    lastLogin: row.ultimo_login,
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

// Login principal: valida a cualquier usuario desde la base de datos.
// La credencial del administrador ya no depende del .env; se reconoce por su role en BD.
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Faltan email o password' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isAdmin = Array.isArray(user.roles)
      ? user.roles.some((role) => {
          const normalized = String(role || '').trim().toLowerCase();
          return normalized === 'admin' || normalized === 'administrador';
        })
      : String(user.role || '').trim().toLowerCase() === 'admin';

    const sessionId = crypto.randomBytes(16).toString('hex');
    await pool.query(
       'UPDATE usuarios SET ultimo_login = NOW() WHERE lower(email) = lower($1)',
      [email]
    );

    const token = generateToken({
      email: user.email,
      role: isAdmin ? 'admin' : (user.role || 'user'),
      sessionId
    });

    return res.json({
      token,
      role: isAdmin ? 'admin' : (user.role || 'user'),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        departamento: user.departamento,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ message: 'Error interno al autenticar' });
  }
}

// Devuelve la información del usuario autenticado usando la BD como fuente real.
async function getMe(req, res) {
  try {
    const user = await findUserByEmail(req.user.email);
    const isAdmin = user
      ? Array.isArray(user.roles)
        ? user.roles.some((role) => {
            const normalized = String(role || '').trim().toLowerCase();
            return normalized === 'admin' || normalized === 'administrador';
          })
        : String(user.role || '').trim().toLowerCase() === 'admin'
      : String(req.user.role || '').trim().toLowerCase() === 'admin';

    return res.json({
      email: user ? user.email : req.user.email,
      role: isAdmin ? 'admin' : (user ? user.role : 'user'),
      isAdmin,
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