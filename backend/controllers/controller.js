//importar las dependencias necesarias
const xlsx = require('xlsx');
const csvparser = require('csv-parser');
const xml2js = require('xml2js');
const path = require('path');
const { Readable } = require('stream');

//Función para convertir un buffer a un stream legible
function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

//Función para parsear archivos según su extensión
async function parseFile(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.csv') {
        return new Promise((resolve, reject) => {
            const rows = [];
            bufferToStream(file.buffer)
                .pipe(csvparser())
                .on('data', (row) => rows.push(row))
                .on('end', () => resolve(rows))
                .on('error', reject);
        });
    }

    if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    }

    if (ext === '.xml') {
        return xml2js.parseStringPromise(file.buffer.toString('utf8'));
    }

    if (ext === '.pdf') {
        return {
            filename: file.originalname,
            size: file.size,
            type: 'PDF Document',
            message: 'PDF file received successfully'
        };
    }

    return file.buffer.toString('utf8');
}

//Controlador para manejar la subida de dos archivos
exports.uploadTwo = async (req, res) => {
    try {
        const [f1, f2] = [req.files?.file1?.[0], req.files?.file2?.[0]];
        if (!f1 || !f2) return res.status(400).json({ error: 'Ambos archivos son requeridos' });

        const [data1, data2] = await Promise.all([parseFile(f1), parseFile(f2)]);
        res.json({ file1: data1, file2: data2 });
    } catch (error) {
        console.error('Controller uploadTwo error:', error);
        res.status(500).json({ error: 'Error al procesar los archivos' });
    }
};
