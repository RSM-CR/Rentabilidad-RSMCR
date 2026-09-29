const express = require('express');
const multer = require('multer');
const controller = require('../controllers/Analisis_controller');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-two', upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), controller.uploadTwo);

module.exports = router;
