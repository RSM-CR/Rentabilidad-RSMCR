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

module.exports = {
  login
};