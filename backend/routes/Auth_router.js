const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkPrivilege } = require('../middlewares/authMiddleware');
const authController = require('../controllers/Auth_Controller'); 


// Ruta pública de Login
router.post('/login', authController.login);

// Ejemplo de ruta protegida (solo usuarios autenticados)
router.get('/perfil', verifyToken, (req, res) => {
  res.json({ message: 'Perfil del usuario', user: req.user });
});

// Ejemplo de ruta restringida por privilegio (por ejemplo, para reportes del departamento)
router.get('/reportes-departamento', verifyToken, checkPrivilege('VER_REPORTES'), (req, res) => {
  res.json({ 
    message: `Reportes financieros para el departamento de: ${req.user.departamento}` 
  });
});

module.exports = router;