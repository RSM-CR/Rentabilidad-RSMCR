const bcrypt = require('bcryptjs');
const pool = require('../db');

// Roles permitidos para nuevos usuarios según el modelo actual.
const validRoles = ['Administrador', 'Gerente', 'Auditoria', 'Analista'];

// Filtros válidos para la lógica de negocio del proyecto.
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

// Revisa que el email tenga un formato válido.
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Revisa que la contraseña tenga la complejidad mínima.
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{14,}$/.test(password);
}

// Crea un usuario nuevo en PostgreSQL con contraseña hasheada.
async function createUser(req, res) {
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

    const normalizedRole = typeof role === 'string' ? role.trim() : '';
    const userRole = validRoles.some((validRole) => validRole.toLowerCase() === normalizedRole.toLowerCase())
      ? normalizedRole
      : null;

    if (!userRole) {
      return res.status(400).json({
        message: 'Debes seleccionar un rol válido para el usuario.'
      });
    }

    if (!filter || typeof filter !== 'string' || !validFilters.includes(filter)) {
      return res.status(400).json({
        message: 'Debes asignar exactamente un filtro válido al usuario.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT 1 FROM usuarios WHERE lower(email) = lower($1)',
        [email]
      );

      if (existing.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'El usuario ya existe' });
      }

      const nombre = email.split('@')[0];
      const insertUser = await client.query(
        `INSERT INTO usuarios (nombre, email, password, departamento)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id`,
        [nombre, email, passwordHash, filter]
      );

      const userId = insertUser.rows[0].user_id;
      let roleId = (await client.query(
        'SELECT role_id FROM role WHERE lower(nombre) = lower($1)',
        [userRole]
      )).rows[0]?.role_id;

      if (!roleId) {
        const newRole = await client.query(
          'INSERT INTO role (nombre) VALUES ($1) RETURNING role_id',
          [userRole]
        );
        roleId = newRole.rows[0].role_id;
      }

      await client.query(
        'INSERT INTO user_role (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleId]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        message: 'Usuario agregado correctamente',
        user: { email, role: userRole }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({ message: 'Error interno al crear usuario' });
  }
}

// Lista todos los usuarios y devuelve su role y filtro asociado.
async function listUsers(req, res) {
  try {
    const query = `
      SELECT
        u.user_id,
        u.nombre,
        u.email,
        u.fecha_creacion,
        u.departamento,
        COALESCE(string_agg(DISTINCT r.nombre, ','), '') AS roles
      FROM usuarios u
      LEFT JOIN user_role ur ON u.user_id = ur.user_id
      LEFT JOIN role r ON ur.role_id = r.role_id
      GROUP BY u.user_id
      ORDER BY u.fecha_creacion DESC
    `;

    const { rows } = await pool.query(query);

    const users = rows.map((row) => ({
      id: row.user_id,
      nombre: row.nombre,
      email: row.email,
      role: row.roles ? row.roles.split(',')[0] : 'user',
      roles: row.roles ? row.roles.split(',').filter(Boolean) : [],
      filter: row.departamento || null,
      createdAt: row.fecha_creacion
    }));

    const adminUser = users.find((user) => user.roles.some((role) => role.toLowerCase() === 'admin'));

    return res.json({
      admin: adminUser ? adminUser.email : null,
      users,
      totalUsers: users.length
    });
  } catch (error) {
    console.error('listUsers error:', error);
    return res.status(500).json({ message: 'Error interno al listar usuarios' });
  }
}

// Elimina un usuario, también borra la relación de roles en la tabla intermedia.
async function deleteUser(req, res) {
  try {
    const emailToDelete = req.params.email;

    if (!isValidEmail(emailToDelete)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    const userResult = await pool.query(
      `SELECT
         u.user_id,
         COALESCE(string_agg(DISTINCT r.nombre, ','), '') AS roles
       FROM usuarios u
       LEFT JOIN user_role ur ON u.user_id = ur.user_id
       LEFT JOIN role r ON ur.role_id = r.role_id
       WHERE lower(u.email) = lower($1)
       GROUP BY u.user_id`,
      [emailToDelete]
    );

    if (!userResult.rowCount) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const roles = userResult.rows[0].roles ? userResult.rows[0].roles.split(',').filter(Boolean) : [];
    if (roles.some((role) => role.toLowerCase() === 'admin')) {
      return res.status(403).json({ message: 'No se puede eliminar al administrador' });
    }

    const userId = userResult.rows[0].user_id;
    await pool.query('DELETE FROM user_role WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM usuarios WHERE user_id = $1', [userId]);

    return res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ message: 'Error interno al eliminar usuario' });
  }
}

module.exports = {
  createUser,
  listUsers,
  deleteUser
};