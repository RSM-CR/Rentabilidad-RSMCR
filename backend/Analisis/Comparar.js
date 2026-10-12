
// Este archivo contiene la lógica de negocio para comparar los datos de XPM y Xero.
// La idea es convertir ambos reportes a un formato comparable y devolver la rentabilidad por cliente.

// Preprocesa el archivo XPM porque su estructura es más irregular y requiere limpieza antes de comparar.
function preprocesarXPM(filasRaw) {

    const resultado = [];
    let staffActual = null;
    let periodoActual = null;
    let clienteActual = null;

    function normalizarValor(valor) {
        if (valor === null || typeof valor === 'undefined') return '';
        return String(valor).trim();
    }

    function esValorNumerico(valor) {
        if (valor === null || typeof valor === 'undefined') return false;
        const limpio = String(valor).replace(/[$,\s]/g, '').replace(/%/g, '');
        return !Number.isNaN(Number(limpio));
    }

    function extraerNumero(row, startIndex = 0, endIndex = row.length) {
        for (let i = endIndex; i >= startIndex; i--) {
            const valor = row[i];
            if (!valor && valor !== 0) continue;
            const limpio = String(valor).replace(/[$,\s]/g, '').replace(/%/g, '');
            if (limpio && !Number.isNaN(Number(limpio))) {
                return Number(limpio);
            }
        }
        return 0;
    }

    function extraerTexto(row, startIndex = 0, endIndex = row.length) {
        for (let i = startIndex; i < Math.min(endIndex, row.length); i++) {
            const valor = normalizarValor(row[i]);
            if (!valor) continue;
            const texto = valor.toLowerCase();
            if (!/period|staff|job no|name|summary|invoice|total|hours|reference|staff time/i.test(texto)) {
                return valor;
            }
        }
        return '';
    }

    for (const fila of filasRaw) {

        if (!fila || fila.every((c) => c === '' || c === null || typeof c === 'undefined')) continue;

        const row = fila.map(normalizarValor);
        const joined = row.join(' ').toLowerCase();

        // Detecta cabeceras de período o staff sin romper el flujo de lectura.
        if (/(period|staff)/i.test(joined) && !/\d/.test(joined)) {
            if (/period/i.test(joined)) {
                const fecha = row.find((cell) => /\d/.test(cell) && !/period|staff/i.test(cell.toLowerCase()));
                if (fecha) periodoActual = fecha;
            }
            if (/staff/i.test(joined)) {
                const nombreStaff = row.find((cell) => cell && !/period|staff/i.test(cell.toLowerCase()));
                if (nombreStaff) staffActual = nombreStaff;
            }
            continue;
        }

        // Omitir títulos y encabezados claramente no relacionados con datos.
        if (/job no|name|staff time|summary report|invoice|report|reference|period|staff/i.test(joined) && !/\d/.test(joined)) {
            continue;
        }

        // Si aparece un bloque de clientes sin una fila detallada, se conserva como nombre de cliente.
        if (row[0] && !row[1] && !/job no|name|staff|period|invoice|summary/i.test(String(row[0]).toLowerCase())) {
            clienteActual = row[0];
            continue;
        }

        const jobNoCandidates = row
            .map((cell, index) => ({ cell, index }))
            .filter(({ cell, index }) => index < 12 && cell && /\d/.test(cell) && !/period|staff|job no|name|summary|invoice/i.test(cell.toLowerCase()));

        const jobNo = jobNoCandidates.length ? String(jobNoCandidates[0].cell).trim() : '';
        if (!jobNo) continue;

        const nombre = clienteActual || extraerTexto(row, 2, 12) || 'nocuno';
        const tarea = extraerTexto(row, 6, 18) || '';
        const nonBillRaw = extraerNumero(row, 8, 18);
        const montoNonBillRaw = extraerNumero(row, 12, 28);
        const billableRaw = extraerNumero(row, 18, 32);
        const montoBillableRaw = extraerNumero(row, 20, 40);

        if (!staffActual && row.some((cell) => /[a-z]/i.test(String(cell)))) {
            staffActual = row.find((cell) => cell && /[a-z]/i.test(cell) && !/period|staff|job no|name|invoice|summary|reference/i.test(cell.toLowerCase())) || 'unknown';
        }

        resultado.push({
            staff: staffActual || 'unknown',
            periodo: periodoActual || '',
            jobNo: String(jobNo).trim(),
            nombre: nombre || 'nocuno',
            tarea: tarea,
            nonBill: nonBillRaw ? String(nonBillRaw) : '0.00',
            montoNonBill: montoNonBillRaw ? String(montoNonBillRaw) : '0.00',
            billable: billableRaw ? String(billableRaw) : '0.00',
            ingresoOB: montoBillableRaw || 0,
        });
    }

    return resultado;
}

// Convierte un valor tipo HH:MM en horas decimales para poder sumar tiempos de forma consistente.
function horasADecimal(horaStr) {
    if (!horaStr || horaStr === '0.00') return 0;

    const partes = String(horaStr).split(':');
    if (partes.length !== 2) return 0;

    const horas = parseInt(partes[0], 10) || 0;
    const minutos = parseInt(partes[1], 10) || 0;

    return horas + (minutos / 60);
}

// Agrupa las filas de XPM por cliente para resumir horas, montos y tareas por cada proyecto o ID.
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

// Agrupa las facturas de Xero por referencia para poder comparar con el dato de XPM.
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
                moneda: fila['moneda'] || fila['Original Currency'] || null,
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
            fechaEmision:    fila['invoiceDate'] || '',
            fechaVencimiento: fila['dueDate'] || '',
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

// Cruza los dos agregados y calcula indicadores de rentabilidad, diferencia de cobro y estado del cliente.
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
            nombre:              clienteXero.nombre || clienteXPM.nombre || '',

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

// Función pública que orquesta el flujo completo: limpia, agrupa, cruza y devuelve el resultado final.
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