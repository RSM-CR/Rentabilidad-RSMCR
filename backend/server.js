//importar las dependencias necesarias
const express = require('express');
const cors = require('cors');
const routes = require('./routes/route');
const app = express();

//definir el puerto y la URL de origen permitida para CORS desde las variables de entorno
const port = process.env.PORT || 3000;
const allowedOrigin = process.env.CORS_ORIGIN;

//cargar las variables de entorno desde el archivo .env
require('dotenv').config();

//configurar CORS para permitir solicitudes desde la URL de origen permitida
app.use(cors({
    origin: allowedOrigin
}));

// montar las rutas de la API
app.use('/api', routes);

//definir una ruta para probar el servidor
app.get('/', (req, res) => {
    res.end('¡Hola Mundo!\n');
});

//mensaje de iniciación del servidor en la terminal
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/`);
})



