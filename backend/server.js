//importar las dependencias necesarias
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

//cargar las variables de entorno desde el archivo .env
require('dotenv').config();

app.use(cors());

//definir una ruta para probar el servidor
app.get('/', (req, res) => {
    res.end('¡Hola Mundo!\n');
});

//mensaje de iniciación del servidor en la terminal
app.listen(port, () => {
    console.log(`Servidor corriendo en http://:${port}/`);
})
