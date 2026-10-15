const express = require('express');
const router = express.Router();

// Importa la lógica de login y perfil del usuario.
const { login, getMe } = require('../controllers/Auth_Controller');
const { authenticateToken } = require('../middleware/Auth_middleware');

// POST /api/login -> valida credenciales y devuelve JWT.
router.post('/login', login);

// GET /api/me -> devuelve información del usuario autenticado.
router.get('/me', authenticateToken, getMe);

module.exports = router;