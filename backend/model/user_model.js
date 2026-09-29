const db = require('../config/db');

class UserModel {
  // Buscar usuario por email (incluyendo sus roles y privilegios para la sesión)
  static async findByEmail(email) {
    const query = `
      SELECT 
        u.user_id,
        u.nombre,
        u.email,
        u.password,
        u.puesto,
        u.departamento,
        ARRAY_AGG(DISTINCT r.nombre) FILTER (WHERE r.nombre IS NOT NULL) AS roles,
        ARRAY_AGG(DISTINCT p.nombre) FILTER (WHERE p.nombre IS NOT NULL) AS privilegios
      FROM usuarios u
      LEFT JOIN user_role ur ON u.user_id = ur.user_id
      LEFT JOIN role r ON ur.role_id = r.role_id
      LEFT JOIN role_privilege rp ON r.role_id = rp.role_id
      LEFT JOIN privilege p ON rp.privilege_id = p.privilege_id
      WHERE u.email = $1
      GROUP BY u.user_id;
    `;
    const { rows } = await db.query(query, [email]);
    return rows[0];
  }

  // Actualizar último login
  static async updateLastLogin(userId) {
    const query = `UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE user_id = $1;`;
    await db.query(query, [userId]);
  }
}

module.exports = UserModel;