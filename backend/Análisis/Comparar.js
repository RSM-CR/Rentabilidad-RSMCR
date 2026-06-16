//función para preprocesar el archivo XPM debido a su estrctura irregular
export function preprocesarXPM(filasRaw) {

    const resultado = [];
    let staffactual = null;

    for (const fila of filasRaw) {

        const col0 = fila[0];
        const col1 = filas[1];

        if (col0 && !col1) {
            staffactual = col0.trim();
            continue;
        }

        const jobNo = fila[1];
        const nombre = fila[3];
        const tarea = fila[7];
        const nonBill = fila[11];
        const montoNonBill = fila[16];
        const billable = fila[20];
        const montoBillable = fila[24];

        if (jobNo && nombre && staffActual) {
            resultado.push({
                staff: staffActual,
                jobNo: jobNo.trim(),
                nombre: String(nombre).trim(),
                tarea: tarea ? String(tarea).trim() : '',
                nonBill: nonBill || '0.00',
                montoNonBill: montoNonBill || '0.00',
                billable: billable || '0.00',
                montoBillable: montoBillable || 0,
            });
        }
    }

    return resultado;
}

//función para convertir las horas a números float
function horasADecimal(horaStr) {
    if (!horaStr || horaStr === '0.00') return 0;

    const partes = String(horaStr).split(':');
    if (partes.length === 2) return 0;

    const horas = parseInt(partes[0], 10) || 0;
    const minutos = parseInt(partes[1], 10) || 0;

    return horas + (minutos / 60);
}

//función para agrupar datos de XPM por cliente
export function agruparXPM(filasXPM) {

    return filasXPM.reduce((acc, fila) => {

        const id = fila.jobNo;

        if (!acc[id]) {
            acc[id] = {
                id: id,
                jobNo: fila.jobNo,
                nombre: fila.nombre,
                horasNoBillables: 0,
                montoNoBillable: 0,
                horasBillables: 0,
                montoBillable: 0,
                tareas: [],
                staffs: [],
            };
        }
        

        acc[id].horasNoBillables += horasADecimal(fila.nonBill);
        acc[id].montoNoBillable += parseFloat(fila.montoNonBill) || 0;
        acc[id].horasBillables += horasADecimal(fila.billable);
        acc[id].montoBillable += parseFloat(fila.montoBillable) || 0;

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
export function agruparXero(filasXero) {

    return filasXero.reduce((acc, fila) => {
        
        const id = fila['Reference'];

        if (!id) return acc;

        if (!acc[id]) {
            acc[id] = {
                id: id,
                reference: fila['Reference'],
                nombre: fila['Contact'],
                totalFacturado: 0,
                totalImpuesto: 0,
                facturas: [],
            };
        }
        
        acc[id].totalFacturado += parseFloat(fila['Gross (Source)']) || 0;
        acc[id].totalImpuesto  += parseFloat(fila['Tax (Source)']) || 0;
 
        acc[id].facturas.push({
            numeroFactura:   fila['Invoice Number'],
            fecha:           fila['Invoice Date'],
            referencia:      fila['Reference'],
            descripcion:     fila['Description'],
            cantidad:        parseFloat(fila['Quantity']) || 0,
            precioUnitario:  parseFloat(fila['Unit Price (ex) (Source)']) || 0,
            descuento:       parseFloat(fila['Discount (ex) (Source)']) || 0,
            impuesto:        parseFloat(fila['Tax (Source)']) || 0,
            montoTotal:      parseFloat(fila['Gross (Source)']) || 0,
            estado: fila     ['Status'],
        });

        return acc;

    }, {});
}

//función para cruzar XPM con Xero y calcular la rentabilidad
export function cruzarYCalcular(xpmAgrupado, xeroAgrupado) {

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
            
        const diferenciaMonto = clienteXero.totalFacturado - clienteXPM.montoBillable;

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
            totalimpuesto:       clienteXero.totalImpuesto,
            facturas:            clienteXero.facturas,
            diferenciaMonto:     diferenciaMonto,
            rentabilidad:        rentabilidadRedondeada,
            estadoRentabilidad:  estadoRentabilidad,
        };
    });
}    

//función que llama al controlador para devolver 
// el análisis completo al frontend
export function procesarComparacion(filasRawXPM, filasXero) {

    const filasXPM = preprocesarXPM(filasRawXPM);

    const xpmAgrupado = agruparXPM(filasXPM);
    const xeroagrupado = agruparXero(filasXero);

    const resultado = cruzarYCalcular(xpmAgrupado, xeroAgrupado);

    return resultado;
}