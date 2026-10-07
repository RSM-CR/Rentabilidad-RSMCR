const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ruta para crear un nuevo usuario (solo accesible por admin)
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

// Ruta para listar todos los usuarios (solo accesible por admin)
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

// Ruta para eliminar un usuario por email (solo accesible por admin)
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

// Ruta para obtener información del usuario autenticado
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