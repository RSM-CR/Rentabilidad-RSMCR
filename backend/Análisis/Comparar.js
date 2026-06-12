//Función para agrupar las filas de XPM por cliente, sumando las horas y montos billables y no billables
export function agruparXPM(filasXPM) {

    return filasXPM.reduce((acc, fila) => {

        const id = fila['ClienteId'];

        if (!acc[id]) {
            acc[id] = {
                id: id,
                nombre: fila['Name'],
                horasNoBillables: 0,
                montoNoBillable: 0,
                horasBillables: 0,
                montoBillable: 0,
            };
        }
        acc[id].horasNoBillables += parseFloat(fila['Non-bill'] || 0);
        acc[id].montoNoBillable += parseFloat(fila['Non-bill Amount'] || 0);
        acc[id].horasBillables += parseFloat(fila['Bill'] || 0);
        acc[id].montoBillable += parseFloat(fila['Bill Amount'] || 0);
        return acc;
    }, {});
}

//Función para agrupar las filas de Xero por cliente
export function agruparXero(filasXero) {

    return filasXero.reduce((acc, fila) => {

        const id = fila['ClienteId'];

    })
}

