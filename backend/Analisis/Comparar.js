/**
 * Convierte fechas de Excel (número serial) a formato legible español (ej: "16 abril 2026")
 * Las fechas en Excel se almacenan como números enteros (serial dates)
 * @param {number|string} excelDate - Número serial de Excel o string de fecha
 * @returns {string} Fecha formateada como "DD mes YYYY"
 */
function formatExcelDate(excelDate) {
    if (!excelDate || excelDate === '') return '';
    
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    try {
        let fecha;
        
        // Si es un número (serial date de Excel)
        if (typeof excelDate === 'number') {
            // Excel serial date: 1 = Jan 1, 1900; convertir a JavaScript date
            fecha = new Date((excelDate - 25569) * 86400 * 1000);
        } else {
            // Si es string, parsear directamente
            fecha = new Date(excelDate);
        }
        
        // Validar que sea una fecha válida
        if (isNaN(fecha.getTime())) return '';
        
        const dia = fecha.getDate();
        const mes = meses[fecha.getMonth()];
        const año = fecha.getFullYear();
        
        return `${dia} ${mes} ${año}`;
    } catch (e) {
        return '';
    }
}

//función para preprocesar el archivo XPM debido a su estructura irregular
function preprocesarXPM(filasRaw) {

    const resultado = [];
    let staffActual = null;
    let periodoActual = null;

    for (const fila of filasRaw) {

        const col0 = fila[0];
        const col1 = fila[1];

        // Omitir filas completamente vacías
        if (!fila || fila.every((c) => c === '' || c === null || typeof c === 'undefined')) continue;

        // Omitir las filas de encabezado/título obvias
        const joined = String((fila || []).join(' ')).toLowerCase();
        if (joined.includes('job no') || joined.includes('name') || joined.includes('staff time') 
            || joined.includes('staff time summary') || joined.includes('invoice')) continue;

        //Gestionar las filas de títulos de staff donde 
        // la primera columna contiene el nombre del personal y la segunda está vacía
        if (col0 && !col1 && !/job no|name|staff time/i.test(String(col0))) {
            staffActual = String(col0).trim();
            continue;
        }

        if (col0 === undefined && col1 === 'Period') {

            const fechaInicio = fila[3] ? String(fila[3]).trim() : '';
            const fechaFin    = fila[5] ? String(fila[5]).trim() : '';
            
            periodoActual = fechaInicio && fechaFin
                ? `${fechaInicio} to ${fechaFin}`
                : fechaInicio || fechaFin || null;
            continue;
        }

        const jobNo = String(fila[1] || '').trim();
        const nombre = String(fila[3] || '').trim();
        const tarea = fila[7];
        const nonBill = fila[11];
        const montoNonBill = fila[16];
        const billable = fila[20];
        const montoBillable = fila[24];

        // Validar jobNo: Tiene que no ser vacía ,contener al menos un dígito y 
        //no ser una etiqueta de encabezado
        if (!jobNo || /job no/i.test(jobNo) || !staffActual) continue;
        if (!/\d/.test(jobNo)) continue;

        resultado.push({
            staff:           staffActual,
            periodo:         periodoActual,
            jobNo:           jobNo,
            nombre:          nombre || 'nocuno',
            tarea:           tarea ? String(tarea).trim() : '',
            nonBill:         nonBill || '0.00',
            montoNonBill:    montoNonBill || '0.00',
            billable:        billable || '0.00',
            ingresoOB:   montoBillable || 0,
        });
    }

    return resultado;
}

//función para convertir las horas a números float
function horasADecimal(horaStr) {
    if (!horaStr || horaStr === '0.00') return 0;

    const partes = String(horaStr).split(':');
    if (partes.length !== 2) return 0;

    const horas = parseInt(partes[0], 10) || 0;
    const minutos = parseInt(partes[1], 10) || 0;

    return horas + (minutos / 60);
}

//función para agrupar datos de XPM por cliente
function agruparXPM(filasXPM) {

    return filasXPM.reduce((acc, fila) => {

        const id = String(fila.jobNo || '').trim();

        // Ignorar ids inválidas / valores tipo encabezado
        if (!id || /job no|reference/i.test(id)) return acc;

        if (!acc[id]) {
            acc[id] = {
                id:                 id,
                nombre:             fila.nombre,
                periodos:           [],
                horasNoBillables:   0,
                montoNoBillable:    0,
                horasBillables:     0,
                ingresoOB:          0,
                tareas:             [],
                staffs:             [],
            };
        }

        acc[id].horasNoBillables += horasADecimal(fila.nonBill);
        acc[id].montoNoBillable  += parseFloat(String(fila.montoNonBill || '').replace(/[,\s]/g, '')) || 0;
        acc[id].horasBillables   += horasADecimal(fila.billable);
        acc[id].ingresoOB        += parseFloat(String(fila.ingresoOB || '').replace(/[,\s]/g, '')) || 0;

        if (fila.tarea && !acc[id].tareas.includes(fila.tarea)) {
            acc[id].tareas.push(fila.tarea);
        }

        if (fila.staff && !acc[id].staffs.includes(fila.staff)) {
            acc[id].staffs.push(fila.staff);
        }

        if (fila.periodo && !acc[id].periodos.includes(fila.periodo)) {
            acc[id].periodos.push(fila.periodo);
        }

        return acc;

    }, {});
}

//función para agrupar datos de Xero por cliente
function agruparXero(filasXero) {

    return filasXero.reduce((acc, fila) => {
        const rawRef = String(fila['reference'] || fila['Referencia'] || '').trim();

        // Omitir valores de reference vacíos  con formato  de encabezado
        if (!rawRef || /reference|referencia/i.test(rawRef)) return acc;

        const id = rawRef;

        if (!acc[id]) {
            acc[id] = {
                id: id,
                nombre: fila['Contact'] || fila['Contact Name'] || '',
                moneda: fila['Original Currency'] || null,
                totalFacturado: 0,
                totalImpuesto: 0,
                facturas: [],
            };
        }

        const parseNum = (v) => parseFloat(String(v || '').replace(/[,\s]/g, '')) || 0;

        acc[id].totalFacturado += parseNum(fila['gross']);
        acc[id].totalImpuesto  += parseNum(fila['tax']);

        acc[id].facturas.push({
            numeroFactura:   fila['invoiceNumber'] || '',
            fechaEmision:    formatExcelDate(fila['invoiceDate']),
            fechaVencimiento: formatExcelDate(fila['dueDate']),
            referencia:      rawRef,
            descripcion:     fila['description'] || '',
            cantidad:        parseNum(fila['quantity']),
            precioUnitario:  parseNum(fila['unitPrice']),
            descuento:       parseNum(fila['discount']),
            impuesto:        parseNum(fila['tax']),
            montoTotal:      parseNum(fila['gross']),
            subtotal:        parseNum(fila['gross']) - parseNum(fila['tax']),
            moneda:          fila['moneda'] || null,
            estado: fila['status'] || '',
        });

        return acc;

    }, {});
}

//función para cruzar XPM con Xero y calcular la rentabilidad
function cruzarYCalcular(xpmAgrupado, xeroAgrupado) {

    const idsClientes = Object.keys(xpmAgrupado);

    return idsClientes.map(id => {

        const clienteXPM = xpmAgrupado[id];
        const clienteXero = xeroAgrupado[id];

        if (!clienteXero) {
            return {
                id:                 id,
                nombre:             clienteXPM.nombre,
                periodos:           clienteXPM.periodos,
                staffs:             clienteXPM.staffs,
                tareas:             clienteXPM.tareas,
                horasBillables:     clienteXPM.horasBillables,
                horasNoBillables:   clienteXPM.horasNoBillables,
                cobro:              0,
                subtotal:           0,
                totalImpuesto:      0,
                ingresoReal:        0,
                totalFacturado:     0,
                moneda:             null,
                facturas:           [],
                diferenciaMonto:    0,
                rentabilidad:       0,
                estadoRentabilidad: 'Sin cruzar',
                mensaje: 'Cliente presente en XPM pero no en Xero',
            };
        }

        //Cobro: monto total facturado en Xero
        const cobro = clienteXero.totalFacturado;

        //Subtotal: total facturado menos impuestos
        const subtotal = cobro - clienteXero.totalImpuesto;

        //Ingreso Real: ingreso total (Xero) menos el cobro estimado (XPM)
        const ingresoReal = cobro - clienteXPM.ingresoOB;

        //Diferencia entre lo que se pensaba cobrar y lo que se facturó 
        const diferenciaMonto = clienteXero.totalFacturado - clienteXPM.ingresoOB;

        //Porcentaje de rentabilidad
        const rentabilidad = cobro !== 0
            ? ((cobro - clienteXPM.ingresoOB) / cobro * 100)
            : 0;

        const rentabilidadRedondeada = Math.round(rentabilidad * 100) / 100;

        const estadoRentabilidad = rentabilidadRedondeada > 20 ? 'Rentable' 
            : rentabilidadRedondeada > 0 ? 'Bajo margen'
            : 'No rentable';
        
        return {
            id: id,
            nombre:              clienteXPM.nombre || clienteXero.contact || '',

            //Datos de XPM
            periodos:            clienteXPM.periodos,
            staffs:              clienteXPM.staffs,
            tareas:              clienteXPM.tareas,
            horasBillables:      clienteXPM.horasBillables,
            horasNoBillables:    clienteXPM.horasNoBillables,
            ingresoOB:           clienteXPM.ingresoOB,

            //Datos de Xero
            cobro,
            subtotal,
            totalImpuesto:       clienteXero.totalImpuesto,
            ingresoReal,
            moneda:              clienteXero.moneda,
            facturas:            clienteXero.facturas,

            //Análisis comparativo
            diferenciaMonto,
            rentabilidad:        rentabilidadRedondeada,
            estadoRentabilidad:  estadoRentabilidad,
        };
    });
}    

//función que llama al controlador para devolver 
// el análisis completo al frontend
function procesarComparacion(filasRawXPM, filasXero) {

    const filasXPM = preprocesarXPM(filasRawXPM);

    const xpmAgrupado = agruparXPM(filasXPM);
    const xeroAgrupado = agruparXero(filasXero);

    // Filtrar los grupos que parezcan encabezados o títulos 
    // (mantiene ids que contienen al menos un número)
    const filterValidIds = (obj) => Object.fromEntries(
        Object.entries(obj).filter(([k]) => /\d/.test(String(k)))
    );

    const xpmAgrupadoFiltrado = filterValidIds(xpmAgrupado);
    const xeroAgrupadoFiltrado = filterValidIds(xeroAgrupado);

    const resultado = cruzarYCalcular(xpmAgrupadoFiltrado, xeroAgrupadoFiltrado);

    return resultado;
}

module.exports = { procesarComparacion };