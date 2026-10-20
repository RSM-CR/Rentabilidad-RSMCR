const express = require('express');
const multer = require('multer');
const controller = require('../controllers/Analisis_controller');
const { authenticateToken } = require('../middleware/Auth_middleware');
const router = express.Router();

// Guarda los archivos en memoria para no escribirlos a disco antes de procesarlos.
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint claro para validar y preparar archivos sin comparar aún.
router.post('/analysis/upload', authenticateToken, upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), controller.uploadFiles);

// Endpoint principal para ejecutar el análisis comparativo completo.
router.post('/analysis/compare', authenticateToken, upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), controller.compareFiles);

// Alias legado para mantener compatibilidad con el nombre anterior.
router.post('/upload-two', authenticateToken, upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), controller.uploadTwo);

module.exports = router;
