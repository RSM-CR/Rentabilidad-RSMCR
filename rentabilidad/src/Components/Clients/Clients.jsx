import React from "react";
import "./Clients.css";

const InvoiceSummary = () => {
  // Datos temporales, se van a cambiar con api a futuro
  const invoice = {
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
      <h2>{invoice.companyName}</h2>

      <p>
        <strong>Número Invoice:</strong> {invoice.invoiceNumber}
      </p>

      <p>
        <strong>Período:</strong> {invoice.periodStart} - {invoice.periodEnd}
      </p>

      <p className="Description">{invoice.description}</p>

      <p>
        <strong>Tipo de moneda:</strong> {invoice.currency}
      </p>

      <p>
        <strong>Subt:</strong> ${invoice.subtotal}
      </p>

      <p>
        <strong>Tax:</strong> ${invoice.tax}
      </p>

      <p>
        <strong>Total:</strong> ${invoice.total}
      </p>
    </div>
  );
};

export default InvoiceSummary;
