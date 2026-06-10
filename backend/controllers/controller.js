 //importar las dependencias necesarias
 const xlsx = require('xlsx');
 const csvparser = require('csv-parser');
 const xml2js = require('xml2js');
 const path = require('path');
const { Readable } = require('stream');

function buffertoSream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}
async function parseFile(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.csv') {
        return new Promise((resolve, reject) => {
            const rows = [];
            buffertoSream(file.buffer)
                .pipe(csvparser())
                .on('data', (row) => rows.push(row))
                .on('end', () => resolve(rows))
                .on('error', reject);
        });
    }
}

if (ext === '.xlsx' || ext === '.xls') {
    
}