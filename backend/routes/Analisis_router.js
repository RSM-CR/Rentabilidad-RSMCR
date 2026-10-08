const express = require('express');
const multer = require('multer');
const controller = require('../controllers/Analisis_controller');
const router = express.Router();

// Guarda los archivos en memoria para no escribirlos a disco antes de procesarlos.
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload-two -> recibe dos archivos y los envía al controlador de comparación.
router.post('/upload-two', upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), controller.uploadTwo);

module.exports = router;
