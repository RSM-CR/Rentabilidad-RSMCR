//importar las dependencias necesarias
const express = require('express');
const multer = require('multer');
const controller = require('../controllers/controller');
const router = express.Router();

//Hacer que los archivos se guarden en memoria para su procesamiento posterior
const upload = multer({ storage: multer.memoryStorage() });

//Definir los campos de los archivos que se esperan subir
router.post( '/upload-two', upload.fields([{
    name: 'file1',
    maxCount: 1
},
{
    name: 'file2',
    maxCount: 1
}]), controller.uploadTwo 
);

module.exports = router; 