const express = require('express');
const router = express.Router();

const analisisRoutes = require('./Analisis_route');

router.use('/', analisisRoutes);

module.exports = router;
