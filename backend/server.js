// Punto de entrada del backend.
// Aquí solo se levanta la app, no se escribe la lógica de negocio.
const app = require('./config/app');

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/`);
  });
}

module.exports = app;
