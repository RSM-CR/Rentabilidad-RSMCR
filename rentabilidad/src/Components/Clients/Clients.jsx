import React from "react";
import "./Clients.css";
import ProfitabilityResults from "../ProfitabilityResults/ProfitabilityResults";
import ClientsList from "../ClientsList/ClientsList";

const InvoiceSummary = ({ client }) => {
  if (!client) {
    return (
      <div className="Company-Information">
        <h2>Seleccione un cliente</h2>
      </div>
    );
  }

  const businessOptionsList = [
    { value: "audit", label: "Auditoría" },
    {
      value: "itAduit&RegulatoryCompliance",
      label: "Auditoría de TI y Cumplimiento Normativo",
    },
    { value: "bpo", label: "BPO" },
    { value: "corporateFinance", label: "Finanzas corporativas" },
    { value: "taxes", label: "Impuestos" },
    { value: "transferPricing", label: "Precios de Transferencia" },
    { value: "ras", label: "RAS" },
    { value: "businessConsulting", label: "Consultoría de Negocios" },
    { value: "itConsulting", label: "IT - Consultoría" },
    { value: "itAdministration", label: "IT - Administración" },
    { value: "administration", label: "Administración" },
    { value: "businessDevelopment", label: "Desarrollo de Negocios" },
  ];

const getBusinessAreaLabel = (value) => {
  const option = businessOptionsList.find(
    (item) => item.value === value
  );
  return option ? option.label : value; // fallback si no encuentra
};

  return (
    //se muestran datos
    <div className="Company-Information">
      <h2>{client.title}</h2>

      <p>
        <strong>Área:</strong> {getBusinessAreaLabel(client.businessArea)}
      </p>

      <p>
        <strong>Número Invoice:</strong> {client.invoiceNumber}
      </p>

      <p>
        <strong>Período:</strong> {client.periodStart} -{" "}
        {client.periodEnd}
      </p>

      <p className="Description">{client.description}</p>

      <p>
        <strong>Tipo de moneda:</strong> {client.currency}
      </p>

      <p>
        <strong>Subt:</strong> {client.subtotal}
      </p>

      <p>
        <strong>Tax:</strong> {client.tax}
      </p>

      <p>
        <strong>Total:</strong> {client.total}
      </p>
    </div>
  );
};

export default InvoiceSummary;
