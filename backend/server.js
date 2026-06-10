//importar las dependencias necesarias
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());

//definir una ruta para probar el servidor
app.get('/', (req, res) => {
    res.end('¡Hola Mundo!\n');
});

//mensaje de iniciación del servidor en la terminal
app.listen(port, () => {
    console.log(`Servidor corriendo en http://:${port}/`);
})
