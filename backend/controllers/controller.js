//importar las dependencias necesarias
const xlsx = require('xlsx');
const csvparser = require('csv-parser');
const xml2js = require('xml2js');
const path = require('path');
const { Readable } = require('stream');
const { procesarComparacion } = require('../Analisis/Comparar');

/**
 * Convierte un buffer en un stream legible.
 * Útil para procesamiento de archivos en memoria sin escribir a disco.
 * @param {Buffer} buffer - Buffer de datos
 * @returns {Stream} Stream legible
 */
function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

/**
 * Parsea archivos según su tipo (XPM o Xero).
 * Para XPM: retorna arreglo de arreglos crudos (estructura variable)
 * Para Xero: retorna arreglo de objetos con headers normalizados (estructura fija en fila 7)
 * Normaliza nombres de columnas con caracteres especiales (paréntesis, espacios, etc)
 * 
 * @param {Object} file - Archivo subido (objeto multer con buffer y originalname)
 * @param {string} tipo - Tipo de archivo: 'xpm' o 'xero'
 * @returns {Array} Datos parseados (arreglo de arreglos o de objetos)
 */
async function parseFile(file, tipo) {
    const ext = path.extname(file.originalname).toLowerCase();

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
            // Leer como arreglo de arreglos para obtener filas y columnas crudas
            const datosRaw = xlsx.utils.sheet_to_json(hoja, { header: 1, defval: '' });
            
            // La fila 7 (índice 6) contiene los encabezados
            const headers = datosRaw[6];
            
            /**
             * Normaliza nombres de headers removiendo caracteres especiales.
             * Convierte "Unit Price (ex) (Source)" → "unitprice" para mapeo consistente
             */
            const normalizeHeader = (header) => {
                return String(header || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
            };
            
            // Mapeo normalizado de encabezados para evitar problemas con caracteres especiales
            const headerMap = {
                'contact': 'contact',
                'invoicenumber': 'invoiceNumber',
                'invoicedate': 'invoiceDate',
                'reference': 'reference',
                'description': 'description',
                'quantity': 'quantity',
                'originalcurrency': 'moneda',
                'duedate': 'dueDate',
                'status': 'status',
                'unitprice': 'unitPrice',
                'discount': 'discount',
                'tax': 'tax',
                'gross': 'gross',
                'itemcode': 'itemCode',
            };
            
            // Crear mapeo dinámico usando nombres normalizados
            const dynamicMap = {};
            headers.forEach((header, i) => {
                if (!header) return;
                
                const normalized = normalizeHeader(header);
                const mappedKey = headerMap[normalized];
                
                if (mappedKey) {
                    dynamicMap[i] = mappedKey;
                } else {
                    // Si no hay mapeo exacto, intentar buscar por patrón
                    if (normalized.includes('unitprice')) {
                        dynamicMap[i] = 'unitPrice';
                    } else if (normalized.includes('discount')) {
                        dynamicMap[i] = 'discount';
                    } else if (normalized.includes('tax') && !normalized.includes('currency')) {
                        dynamicMap[i] = 'tax';
                    } else if (normalized.includes('gross')) {
                        dynamicMap[i] = 'gross';
                    }
                }
            });
            
            // Mapear desde la fila 8 (índice 7) en adelante con nombres normalizados
            // Cada fila se convierte en un objeto con claves normalizadas
            return datosRaw.slice(7).map(row => {
                const obj = {};
                Object.keys(dynamicMap).forEach(colIndex => {
                    const normKey = dynamicMap[colIndex];
                    obj[normKey] = row[colIndex] !== undefined ? row[colIndex] : '';
                });
                return obj;
            });
        }
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
