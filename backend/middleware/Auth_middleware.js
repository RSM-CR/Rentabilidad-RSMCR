const jwt = require('jsonwebtoken');

// Middleware para verificar que el usuario esté autenticado mediante JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secreto_super_seguro');
    req.user = verified; // Contiene id, email, roles y privilegios del usuario
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware para verificar si el usuario tiene un privilegio específico (ej: 'VER_REPORTES')
const checkPrivilege = (requiredPrivilege) => {
  return (req, res, next) => {
    if (!req.user || !req.user.privileges) {
      return res.status(403).json({ error: 'Acceso denegado. Sin permisos asignados.' });
    }

    const hasPrivilege = req.user.privileges.includes(requiredPrivilege);
    if (!hasPrivilege) {
      return res.status(403).json({ 
        error: `Acceso restringido. Requiere el permiso: ${requiredPrivilege}` 
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkPrivilege
};

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