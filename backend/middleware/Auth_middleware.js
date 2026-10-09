const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'secret-key-default';

// Verifica que el token JWT sea válido y carga la información del usuario.
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token no enviado' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }

    req.user = decoded;
    next();
  });
}

// Revisa si el usuario autenticado tiene permisos de administrador.
// La validación se basa en el role del token, generado desde la BD.
function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';

  if (!isAdmin) {
    return res.status(403).json({
      message: 'Acceso denegado. Solo administradores pueden acceder.'
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  authorizeAdmin,
  verifyToken: authenticateToken
};