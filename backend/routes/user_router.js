const express = require('express');
const router = express.Router();

// Importa los controladores de usuarios y la protección de auth.
const { createUser, listUsers, deleteUser } = require('../controllers/user_controller');
const { authenticateToken, authorizeAdmin } = require('../middleware/Auth_middleware');

// Las rutas de gestión de usuarios se protegen con JWT, pero el frontend puede
// enviar el token automáticamente sin que el usuario lo introduzca a mano cada vez.
router.post('/', authenticateToken, authorizeAdmin, createUser);
router.get('/', authenticateToken, authorizeAdmin, listUsers);
router.delete('/:email', authenticateToken, authorizeAdmin, deleteUser);

module.exports = router;