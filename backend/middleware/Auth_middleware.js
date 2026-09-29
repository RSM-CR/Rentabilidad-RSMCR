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