// Importa las librerías necesarias para leer Excel, CSV y XML.
// Estas dependencias sirven para convertir archivos de proveedores a datos legibles.
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
// Esta función hace la limpieza inicial del archivo: detecta la extensión,
// lee la hoja de cálculo y devuelve una estructura uniforme para compararlo más tarde.
async function parseFile(file, tipo) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.read(file.buffer, { type: 'buffer', cellDates: true });
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
            const datosRaw = xlsx.utils.sheet_to_json(hoja, { header: 1, defval: '', cellDates: true });
            
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
            return datosRaw.slice(7).map((row, rowIndex) => {
                const objeto = {};
                const filaReal = 7 + rowIndex;

                Object.keys(dynamicMap).forEach(colIndex => {
                    const normKey = dynamicMap[colIndex];
                    const columna = Number(colIndex);
                    const celda = hoja[xlsx.utils.encode_cell({ c: columna, r: filaReal })];

                    if (['invoiceDate', 'dueDate'].includes(normKey) && celda && typeof celda.w === 'string' && celda.w.trim() !== '') {
                        objeto[normKey] = celda.w.trim();
                    } else {
                        objeto[normKey] = row[columna] !== undefined ? row[columna] : '';
                    }
                });

                return objeto;
            });
        }
    }

    return file.buffer.toString('utf8');
}

function buildErrorResponse(status, code, message, details = null) {
    return res => res.status(status).json({
        success: false,
        code,
        message,
        ...(details ? { details } : {})
    });
}

async function validateAndParseFiles(req, res) {
    const [f1, f2] = [req.files?.file1?.[0], req.files?.file2?.[0]];
    if (!f1 || !f2) {
        return buildErrorResponse(400, 'MISSING_FILES', 'Se requieren exactamente dos archivos: file1 y file2.')(res);
    }

    const extensionesPermitidas = ['.xlsx', '.xls', '.pdf'];
    const MAX_BYTES = 10 * 1024 * 1024;

    const extF1 = path.extname(f1.originalname).toLowerCase();
    const extF2 = path.extname(f2.originalname).toLowerCase();

    if (!extensionesPermitidas.includes(extF1)) {
        return buildErrorResponse(
            400,
            'INVALID_XPM_EXTENSION',
            'El archivo XPM tiene una extensión no permitida.',
            { received: extF1, expected: ['.xlsx', '.xls', '.pdf'] }
        )(res);
    }

    if (!extensionesPermitidas.includes(extF2)) {
        return buildErrorResponse(
            400,
            'INVALID_XERO_EXTENSION',
            'El archivo Xero tiene una extensión no permitida.',
            { received: extF2, expected: ['.xlsx', '.xls', '.pdf'] }
        )(res);
    }

    if (f1.size > MAX_BYTES) {
        return buildErrorResponse(
            400,
            'FILE_TOO_LARGE',
            'El archivo XPM supera el tamaño máximo permitido de 10 MB.',
            { sizeBytes: f1.size }
        )(res);
    }

    if (f2.size > MAX_BYTES) {
        return buildErrorResponse(
            400,
            'FILE_TOO_LARGE',
            'El archivo Xero supera el tamaño máximo permitido de 10 MB.',
            { sizeBytes: f2.size }
        )(res);
    }

    try {
        const [data1, data2] = await Promise.all([
            parseFile(f1, 'xpm'),
            parseFile(f2, 'xero')
        ]);

        if (!Array.isArray(data1) || data1.length === 0) {
            return buildErrorResponse(
                422,
                'EMPTY_XPM_FILE',
                'El archivo XPM está vacío o no tiene un formato compatible.',
                { file: f1.originalname }
            )(res);
        }

        if (!Array.isArray(data2) || data2.length === 0) {
            return buildErrorResponse(
                422,
                'EMPTY_XERO_FILE',
                'El archivo Xero está vacío o no tiene un formato compatible.',
                { file: f2.originalname }
            )(res);
        }

        return { data1, data2, file1: f1.originalname, file2: f2.originalname };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR CRÍTICO - ${error.message}`);
        console.error(error.stack);

        if (error.message.includes('password')) {
            return buildErrorResponse(
                422,
                'PASSWORD_PROTECTED_FILE',
                'Uno de los archivos está protegido por contraseña y no se puede leer.'
            )(res);
        }

        if (
            error.message.includes('parse') ||
            error.message.includes('Hoja de cálculo') ||
            error.message.includes('hoja de cálculo') ||
            error.message.includes('No se encontró')
        ) {
            return buildErrorResponse(
                422,
                'UNREADABLE_FILE',
                'Uno de los archivos tiene un formato que no se pudo leer correctamente.'
            )(res);
        }

        return buildErrorResponse(
            500,
            'INTERNAL_ERROR',
            'Error interno al procesar los archivos.'
        )(res);
    }
}

exports.uploadFiles = async (req, res) => {
    console.log(`[${new Date().toISOString()}] INICIO - UPLOAD | Validación y parseo de archivos`);

    const validated = await validateAndParseFiles(req, res);
    if (!validated || validated.success === false) return;

    const { data1, data2, file1, file2 } = validated;

    console.log(`[${new Date().toISOString()}] ÉXITO - Archivos validados | XPM: ${data1.length} filas | Xero: ${data2.length} filas`);

    return res.status(200).json({
        success: true,
        context: 'upload',
        message: 'Archivos validados correctamente.',
        files: {
            file1,
            file2,
            xpmRows: data1.length,
            xeroRows: data2.length
        }
    });
};

exports.compareFiles = async (req, res) => {
    console.log(`[${new Date().toISOString()}] INICIO - COMPARE | Validación y comparación de archivos`);

    const validated = await validateAndParseFiles(req, res);
    if (!validated || validated.success === false) return;

    const { data1, data2 } = validated;
    const resultado = procesarComparacion(data1, data2);

    console.log(`[${new Date().toISOString()}] RESULTADO - ${resultado.length} clientes procesados`);

    return res.status(200).json({
        success: true,
        context: 'compare',
        message: 'Análisis realizado correctamente.',
        resultado
    });
};

// Alias heredado: mantiene compatibilidad con el nombre anterior.
exports.uploadTwo = async (req, res) => {
    console.log(`[${new Date().toISOString()}] INICIO - LEGACY | Compatibilidad con upload-two`);
    return exports.compareFiles(req, res);
};
