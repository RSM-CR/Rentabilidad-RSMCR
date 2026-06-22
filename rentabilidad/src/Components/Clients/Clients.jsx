import React from "react";
import "./Clients.css";
import ProfitabilityResults from '../..//Components/ProfitabilityResults/ProfitabilityResults';

const InvoiceSummary = () => {
  // Datos temporales, se van a cambiar con api a futuro
  const invoiceData = {
    companyName: "Empresa de ejemplo",
    invoiceNumber: "00001010929",
    periodStart: "Octubre 2024",
    periodEnd: "Noviembre 2025",
    description:
      "Descripción de ejemplo. Descripción de ejemplo. Descripción de ejemplo. Descripción de ejemplo. Descripción de ejemplo. Descripción de ejemplo.",
    currency: "Dólar US",
    subtotal: "1260.00",
    tax: "240.00",
    total: "1500.00",
  };

  return (
    <div className="Company-Information">
      <h2>{invoiceData.companyName}</h2>

      <p>
        <strong>Número Invoice:</strong> {invoiceData.invoiceNumber}
      </p>

      <p>
        <strong>Período:</strong> {invoiceData.periodStart} - {invoiceData.periodEnd}
      </p>

      <p className="Description">{invoiceData.description}</p>

      <p>
        <strong>Tipo de moneda:</strong> {invoiceData.currency}
      </p>

      <p>
        <strong>Subt:</strong> {invoiceData.subtotal}
      </p>

      <p>
        <strong>Tax:</strong> {invoiceData.tax}
      </p>

      <p>
        <strong>Total:</strong> {invoiceData.total}
      </p>
    </div>
  );
};


export default InvoiceSummary;
