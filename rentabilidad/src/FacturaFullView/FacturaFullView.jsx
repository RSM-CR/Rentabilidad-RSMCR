import React from "react";
import "./FacturaFullView.css";
import Header from "../Components/Header";
import BtnRegresar from "../Components/btn-regresar";

function FacturaFullView({ factura, onRegresar }) {
  const subtotal = factura?.subtotal ?? 173913;
  const impuesto = factura?.impuesto ?? 26087;
  const total = subtotal + impuesto;
  const tasaImpuesto = factura?.tasaImpuesto ?? 15;

  {/*header */ }
  return (
    <div className="app-wrapper">
      <Header />
      {/* Contenido */}
      <main className="main">
        <BtnRegresar onClick={onRegresar} />
        <div className="card">
          {/* Estado de la factura, si esta Pendiente, pagada o vencida */}
          <div className="estado-badge">
            <span>Estado de la factura</span>
            <span className="estado-dot" />
          </div>

          <div className="card-body">

            {/* Columna de informacion */}
            {/* ESTA PARTE CONTIENE ALGUNOS CAMPOS CON NOMBRE DEFAULT POR FAVOR CAMBIAR DESPUES*/}
            <div className="col-left">
              <h2 className="empresa-nombre">
                {factura?.empresa ?? "Empresa xxxxx"}
              </h2>
              <hr className="divider" />

              <label className="campo-label">Numero de Factura</label>
              <div className="campo-valor">
                {factura?.numero ?? "#00000000000000000"}
              </div>

              <label className="campo-label" style={{ marginTop: "1.2rem" }}>
                Fecha de Emisión
              </label>
              <div className="campo-valor">
                {factura?.fechaEmision ?? "DD/MM/YYYY"}
              </div>

              <label className="campo-label" style={{ marginTop: "1.2rem" }}>
                Fecha de Vencimiento
              </label>
              <div className="campo-valor">
                {factura?.fechaVencimiento ?? "DD/MM/YYYY"}
              </div>

              {/* Logo RSM */}
              <div className="rsm-logo">
                <img src="/LogoRSM.png" alt="Logo RSM" />
              </div>
            </div>


            <div className="col-divider" />

            {/* Columna derecha */}
            <div className="col-right">
              <div className="monto-card">
                <span className="monto-label">Monto</span>
                <span className="monto-valor">
                  {total.toLocaleString("es-CR")}
                </span>
              </div>

              <div className="desglose">
                <p>
                  <strong>Subtotal:</strong> ₡{subtotal.toLocaleString("es-CR")}
                </p>
                <p>
                  <strong>Impuesto de [{tasaImpuesto}%]:</strong> ₡
                  {impuesto.toLocaleString("es-CR")}
                </p>
                <hr className="divider-blue" />
                <p className="total-line">
                  <strong>Total: ₡{total.toLocaleString("es-CR")}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FacturaFullView;
