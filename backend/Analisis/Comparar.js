//función para preprocesar el archivo XPM debido a su estructura irregular
function preprocesarXPM(filasRaw) {

    const resultado = [];
    let staffActual = null;

    for (const fila of filasRaw) {

        const col0 = fila[0];
        const col1 = fila[1];

        // Omitir fials completamente vacías
        if (!fila || fila.every((c) => c === '' || c === null || typeof c === 'undefined')) continue;

        // Omitir las filas de encabezado/título obvias
        const joined = String((fila || []).join(' ')).toLowerCase();
        if (joined.includes('job no') || joined.includes('name') || joined.includes('staff time') || joined.includes('staff time summary') || joined.includes('invoice')) continue;

        //Gestionar las filas de títulos de staff donde 
        // la primera columna contiene el nombre del personal y la segunda está vacía
        if (col0 && !col1 && !/job no|name|staff time/i.test(String(col0))) {
            staffActual = String(col0).trim();
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
            jobNo:           jobNo,
            nombre:          nombre || 'nocuno',
            tarea:           tarea ? String(tarea).trim() : '',
            nonBill:         nonBill || '0.00',
            montoNonBill:    montoNonBill || '0.00',
            billable:        billable || '0.00',
            montoBillable:   montoBillable || 0,
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
                horasNoBillables:   0,
                montoNoBillable:    0,
                horasBillables:     0,
                montoBillable:      0,
                tareas:             [],
                staffs:             [],
            };
        }

        acc[id].horasNoBillables += horasADecimal(fila.nonBill);
        acc[id].montoNoBillable  += parseFloat(String(fila.montoNonBill || '').replace(/[,\s]/g, '')) || 0;
        acc[id].horasBillables   += horasADecimal(fila.billable);
        acc[id].montoBillable    += parseFloat(String(fila.montoBillable || '').replace(/[,\s]/g, '')) || 0;

        if (fila.tarea && !acc[id].tareas.includes(fila.tarea)) {
            acc[id].tareas.push(fila.tarea);
        }

        if (fila.staff && !acc[id].staffs.includes(fila.staff)) {
            acc[id].staffs.push(fila.staff);
        }

        return acc;

    }, {});
}

//función para agrupar datos de Xero por cliente
function agruparXero(filasXero) {

    return filasXero.reduce((acc, fila) => {
        const rawRef = String(fila['Reference'] || fila['Referencia'] || '').trim();

        // Omitir valores de reference vacíos  con formato  de encabezado
        if (!rawRef || /reference|referencia/i.test(rawRef)) return acc;

        const id = rawRef;

        if (!acc[id]) {
            acc[id] = {
                id: id,
                nombre: fila['Contact'] || fila['Contact Name'] || '',
                totalFacturado: 0,
                totalImpuesto: 0,
                facturas: [],
            };
        }

        const parseNum = (v) => parseFloat(String(v || '').replace(/[,\s]/g, '')) || 0;

        acc[id].totalFacturado += parseNum(fila['Gross (Source)']);
        acc[id].totalImpuesto  += parseNum(fila['Tax (Source)']);

        acc[id].facturas.push({
            numeroFactura:   fila['Invoice Number'] || '',
            fecha:           fila['Invoice Date'] || '',
            referencia:      rawRef,
            descripcion:     fila['Description'] || '',
            cantidad:        parseNum(fila['Quantity']),
            precioUnitario:  parseNum(fila['Unit Price (ex) (Source)']),
            descuento:       parseNum(fila['Discount (ex) (Source)']),
            impuesto:        parseNum(fila['Tax (Source)']),
            montoTotal:      parseNum(fila['Gross (Source)']),
            estado: fila['Status'] || '',
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
                staffs:             clienteXPM.staffs,
                tareas:             clienteXPM.tareas,
                horasBillables:     clienteXPM.horasBillables,
                horasNoBillables:   clienteXPM.horasNoBillables,
                montoBillableXPM:   clienteXPM.montoBillable,
                totalFacturadoXero: 0,
                totalImpuesto:      0,
                facturas:           [],
                diferenciaMonto:    0,
                rentabilidad:       0,
                estadoRentabilidad: 'Sin cruzar',
                mensaje: 'Cliente presente en XPM pero no en Xero',
            };
        }
        //Diferencia entre lo que se pensaba cobrar y lo que se facturó 
        const diferenciaMonto = clienteXero.totalFacturado - clienteXPM.montoBillable;

        //Porcentaje de rentabilidad
        const rentabilidad = clienteXero.totalFacturado !== 0
            ? ((clienteXero.totalFacturado - clienteXPM.montoBillable) 
                / clienteXero.totalFacturado * 100)
            : 0;

        const rentabilidadRedondeada = Math.round(rentabilidad * 100) / 100;

        const estadoRentabilidad = rentabilidadRedondeada > 20 ? 'Rentable' 
            : rentabilidadRedondeada > 0 ? 'Bajo margen'
            : 'No rentable';
        
        return {
            id: id,
            nombre:              clienteXero.nombre,
            staff:               clienteXPM.staffs,
            tareas:              clienteXPM.tareas,
            horasBillables:      clienteXPM.horasBillables,
            horasNoBillables:    clienteXPM.horasNoBillables,
            montoBillableXPM:    clienteXPM.montoBillable,
            totalFacturadoXero:  clienteXero.totalFacturado,
            totalImpuesto:       clienteXero.totalImpuesto,
            facturas:            clienteXero.facturas,
            diferenciaMonto:     diferenciaMonto,
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

    console.log('[procesarComparacion] xpm keys before:', Object.keys(xpmAgrupado).length);
    console.log('[procesarComparacion] xpm keys after filter:', Object.keys(xpmAgrupadoFiltrado).length);
    console.log('[procesarComparacion] sample xpm keys before:', Object.keys(xpmAgrupado).slice(0,10));
    console.log('[procesarComparacion] sample xpm keys after:', Object.keys(xpmAgrupadoFiltrado).slice(0,10));

    const resultado = cruzarYCalcular(xpmAgrupadoFiltrado, xeroAgrupadoFiltrado);

    return resultado;
}

module.exports = { procesarComparacion };