import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./FacturaPrincipal.css";
import Header from "../Header";

/*DATOS DE PRUEBA, por favor hacer los cambios de los datos aqui*/
const FACTURAS_PRUEBA = [
  {
    id: 1,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/6/26",
    fechaVencimiento: "11/7/26",
    impuesto: 26087,
    monto: 200000,
    estado: "pagado",
  },
  {
    id: 2,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/6/26",
    fechaVencimiento: "11/7/26",
    impuesto: 26087,
    monto: 200000,
    estado: "pendiente",
  },
  {
    id: 3,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/5/26",
    fechaVencimiento: "11/6/26",
    impuesto: 26087,
    monto: 200000,
    estado: "pagado",
  },
  {
    id: 4,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/1/26",
    fechaVencimiento: "11/2/26",
    impuesto: 26087,
    monto: 200000,
    estado: "vencido",
  },
  {
    id: 5,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/1/26",
    fechaVencimiento: "11/6/26",
    impuesto: 26087,
    monto: 200000,
    estado: "vencido",
  },
  {
    id: 6,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/1/26",
    fechaVencimiento: "11/6/26",
    impuesto: 26087,
    monto: 200000,
    estado: "pendiente",
  },
  {
    id: 7,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/1/26",
    fechaVencimiento: "11/5/26",
    impuesto: 26087,
    monto: 200000,
    estado: "pendiente",
  },
  {
    id: 8,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/16/26",
    fechaVencimiento: "11/2/26",
    impuesto: 26087,
    monto: 200000,
    estado: "pagado",
  },
  {
    id: 9,
    empresa: "Empresa #XXXXXX",
    factura: "#0000000000000",
    fechaEmision: "11/2/26",
    fechaVencimiento: "11/2/26",
    impuesto: 26087,
    monto: 200000,
    estado: "pagado",
  },
];

/* Configuración visual de cada estado: etiqueta, color del punto y clase CSS*/

const ESTADOS = {
  pagado: { label: "Pagado", className: "estado-pagado" },
  pendiente: { label: "Pendiente", className: "estado-pendiente" },
  vencido: { label: "Vencido", className: "estado-vencido" },
};

function formatoColones(valor) {
  return "₡" + valor.toLocaleString("es-CR");
}

export default function FacturaPrincipal({ nombreUsuario, onRegresar }) {
  const navigate = useNavigate();

  //Filtro activo
  const [filtroActivo, setFiltroActivo] = useState(null);

  //Página actual 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtrar facturas según el estado activo (si hay uno)
  const facturasFiltradas = filtroActivo
    ? FACTURAS_PRUEBA.filter((f) => f.estado === filtroActivo)
    : FACTURAS_PRUEBA;

  // pagination)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const facturasActuales = facturasFiltradas.slice(startIndex, endIndex); // ← Usa facturasFiltradas

  const totalPages = Math.ceil(facturasFiltradas.length / itemsPerPage); // ← Usa facturasFiltradas

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  function manejarClicFiltro(estado) {
    setFiltroActivo((actual) => (actual === estado ? null : estado));
  }

  return (
    <div className="rsm-container">
      {/*header listo */}
      <Header />

      <div className="rsm-body">
        {/* Botón de regresar, que ejecuta la función onRegresar pasada como prop */}

        <h2 className="rsm-subtitulo">Estados de Factura</h2>

        {/* Filtros */}
        <div className="rsm-filtros">
          {Object.entries(ESTADOS).map((par) => {
            const clave = par[0]; // "pagado"
            const datosEstado = par[1]; // { label: "Pagado", className: "estado-pagado" }

            // Esto determina si este filtro está activo
            const esElFiltroActivo = filtroActivo === clave;

            return (
              <button
                key={clave}
                className={`rsm-filtro-btn ${datosEstado.className} ${esElFiltroActivo ? "activo" : ""}`}
                onClick={() => manejarClicFiltro(clave)}
              >
                {datosEstado.label} <span className={`rsm-punto ${datosEstado.className}`} />
              </button>
            );
          })}
        </div>

        {/* Tabla de contenidos*/}
        <table className="rsm-tabla">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Factura</th>
              <th>Fechas</th>
              <th>Impuesto</th>
              <th>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            
            {facturasActuales.map((factura) => {
              const estadoInfo = ESTADOS[factura.estado];
              const impuestoFormateado = formatoColones(factura.impuesto);
              const montoFormateado = formatoColones(factura.monto);

              return (
                <tr
                  key={factura.id}
                  onClick={() => navigate(`/facturaFV/${factura.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="rsm-bold">{factura.empresa}</td>

                  <td className="rsm-bold">{factura.factura}</td>

                  <td className="rsm-fechas">
                    <div>Fecha de emisión: {factura.fechaEmision}</div>
                    <div>Fecha de vencimiento: {factura.fechaVencimiento}</div>
                  </td>

                  {/* Impuesto y monto, formateados como colones */}
                  <td className="rsm-bold">{impuestoFormateado}</td>
                  <td className="rsm-bold">{montoFormateado}</td>

                  {/* Estado de la factura: una pastilla de color con su texto */}
                  <td>
                    <span className={`rsm-pill ${estadoInfo.className}`}>
                      {estadoInfo.label} <span className={`rsm-punto ${estadoInfo.className}`} />
                    </span>
                  </td>
                </tr>
              );
            })}

            
            {facturasActuales.length === 0 && (
              <tr>
                <td colSpan={6} className="rsm-sin-resultados">
                  No hay facturas con este estado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* pagination, la navegacion entre las paginas */}
        <div className="pagination">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
          >
            Anterior
          </button>

          <span>Página {currentPage} de {totalPages}</span>

          <button 
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}