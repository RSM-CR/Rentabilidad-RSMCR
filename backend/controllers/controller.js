//importar las dependencias necesarias
const xlsx = require('xlsx');
const csvparser = require('csv-parser');
const xml2js = require('xml2js');
const path = require('path');
const { Readable } = require('stream');
const { procesarComparacion } = require('../Analisis/Comparar');

//Función para convertir un buffer a un stream legible
function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

//Función para parsear archivos según su extensión
async function parseFile(file, tipo) {
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
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('El archivo Excel no contiene hojas válidas');
        }
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        if (!hoja) {
            throw new Error('No se encontró una hoja de cálculo válida en el archivo Excel');
        }

        if (tipo === 'xpm') {
            return xlsx.utils.sheet_to_json(hoja, { header: 1, defval: '' });
        }

        if (tipo === 'xero') {
            return xlsx.utils.sheet_to_json(hoja, { range: 6, defval: '' });
        }
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

    //para registrar el inicio de cada solicitud
    console.log(`[${new Date().toISOString()}] INICIO - Solicitud de comparación recibida `);

    try {
        const [f1, f2] = [req.files?.file1?.[0], req.files?.file2?.[0]];
        if (!f1 || !f2) return res.status(400).json({ error: 'Ambos archivos son requeridos' });

        //para registrar qué archivos llegaron
        console.log(`[${new Date().toISOString()}] Archivos recibidos - XPM: ${f1.originalname}
        | Xero: ${f2.originalname} `);

        const extensionesXPM = ['.xlsx', '.xls', '.pdf'];
        const extensionesXero = ['.xlsx', '.xls', '.pdf'];

        //Tamaño máximo para ambos archivos
        const MAX_BYTES = 10 * 1024 * 1024;

        const extF1 = path.extname(f1.originalname).toLowerCase();
        const extF2 = path.extname(f2.originalname).toLowerCase();

        //Validación de la extensión de archivos
        if (!extensionesXPM.includes(extF1)) {
            console.log(`[${new Date().toISOString()}] ERROR - Extensión no válida para XPM: ${extF1}`);
            return res.status(400).json({
                error: `El archivo de XPM tiene una extensión no permitida (${extF1}). Se aceptan: xlsx, xls, pdf`
            });
        }

        if (!extensionesXero.includes(extF2)) {
            console.log(`[${new Date().toISOString()}] ERROR - Extensión no válida para Xero: ${extF2}`);
            return res.status(400).json({
                error: `El archivo de Xero tiene una extensión no permitida (${extF2}). Se aceptan: xlsx, xls, pdf`
            });
        }

        //Validación de tamaño de archivos
        if (f1.size > MAX_BYTES) {
            console.log(`[${new Date().toISOString()}] ERROR - Archivo XPM demasiado grande: ${f1.size} bytes`);
            return res.status(400).json({
                error: `El archivo de XPM supera el tamaño máximo permitido de 10 MB`
            });
        }

        if (f2.size > MAX_BYTES) {
            console.log(`[${new Date().toISOString()}] ERROR - Archivo Xero demasiado grande: ${f2.size} bytes`);
            return res.status(400).json({
                error: `El archivo de Xero supera el tamaño máximo permitido de 10 MB`
            });
        }

        const [data1, data2] = await Promise.all([
            parseFile(f1, 'xpm'),
            parseFile(f2, 'xero')
        ]);

        //Si los archivos están vación o con formato distinto
        if (!Array.isArray(data1) || data1.length === 0) {

            console.log(`[${new Date().toISOString()}] ERROR - Archivo XPM vacío o con formato 
            incorrecto: ${f1.originalname}`);

            return res.status(422).json({
                error: 'El archivo de XPM está vacío o no tiene el formato correcto'
            });
        }

        if (!Array.isArray(data2) || data2.length === 0) {
            console.log(`[${new Date().toISOString()}] ERROR - Archivo Xero vacío o con formato 
            incorrecto: ${f2.originalname}`);
            return res.status(422).json({
                error: 'El archivo de Xero está vacío o no tiene el formato correcto'
            });
        }

        console.log(`[${new Date().toISOString()}] ÉXITO - Archivos procesados | XPM: ${data1.length}
        filas | Xero: ${data2.length} filas`);

        const resultado = procesarComparacion(data1, data2);

        console.log(`[${new Date()}] RESULTADO - ${resultado.length} clientes procesados`)

        res.json({ resultado });

    //Validación de errores misceláneos
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR CRÍTICO - ${error.message}`);
        console.error(error.stack);

        if (error.message.includes('password')) {
            return res.status(422).json({
                error: 'Uno de los archivos está protegido con contraseña'
            });
        }

        if (error.message.includes('parse') || error.message.includes('Hoja de cálculo') || error.message.includes('hoja de cálculo') || error.message.includes('No se encontró')) {
            return res.status(422).json({
                error: 'Uno de los archivos tiene un formato que no se puede leer'
            });
        }

        res.status(500).json({ error: 'Error interno al procesar los archivos'});
    }
};
