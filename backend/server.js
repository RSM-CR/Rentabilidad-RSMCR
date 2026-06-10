const express = require('express');
const cors = require('cors');
const csvparser = require('csv-parser');
const multer = require('multer');
const xlsx = require('xlsx');
const xml2js = require('xml2js');
const app = express();
const port = 3000;

app.use(cors());

app.get('/', (req, res) => {
    res.end('¡Hola Mundo!\n');
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://:${port}/`);
})
