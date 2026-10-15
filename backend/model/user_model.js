const db = require('../db');

// Modelo de usuario para acceder a la información de PostgreSQL.
class UserModel {
  // Busca un usuario por email y trae sus roles para el login.
  static async findByEmail(email) {
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

    const { rows } = await db.query(query, [email]);
    return rows[0] || null;
  }

  // Actualiza la fecha del último login del usuario.
  static async updateLastLogin(userId) {
    const query = `UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE user_id = $1;`;
    await db.query(query, [userId]);
  }
}

module.exports = UserModel;