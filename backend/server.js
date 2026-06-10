const express = require('express');
const cors = require('cors');
const csvparser = require('csv-parser');
const multer = require('multer');
const xlsx = require('xlsx');
const xml2js = require('xml2js');
const port = 3000;
const http = require('node:http');

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World\n');
});

server.listen(port, () => {
    console.log(`Servidor corriendo en http://:${port}/`);
})
