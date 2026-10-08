const express = require('express');
const router = express.Router();

// Importa los controladores de usuarios y la protección de admin.
const { createUser, listUsers, deleteUser } = require('../controllers/user_controller');
const { authenticateToken, authorizeAdmin } = require('../middleware/Auth_middleware');

// POST /api/users -> crea un usuario nuevo y exige token + permisos de admin.
router.post('/', authenticateToken, authorizeAdmin, createUser);

// GET /api/users -> lista usuarios y exige token + permisos de admin.
router.get('/', authenticateToken, authorizeAdmin, listUsers);

// DELETE /api/users/:email -> elimina un usuario y exige token + permisos de admin.
router.delete('/:email', authenticateToken, authorizeAdmin, deleteUser);

module.exports = router;