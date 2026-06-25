import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./ClientsList.css";

//PLANTILLA CLIENTE (API)//
const createClientModel = (data = {}) => ({
  id: data.id,
  title: data.title || "",
  businessArea: data.businessArea || "",
  invoices: data.invoices || [],
  invoiceNumber: data.invoiceNumber || "",
  periodStart: data.periodStart || "",
  periodEnd: data.periodEnd || "",
  description: data.description || "",
  currency: data.currency || "",
  subtotal: data.subtotal || "",
  tax: data.tax || "",
  total: data.total || "",
  profitability: {
    charge: "",
    expectedIncome: "",
    realIncome: "",
    hours: "",
    projectedHours: "",
    realHours: "",
    overallProfitability: "",
  },
});

//MOCK (luego API)//
const initialClients = [
  createClientModel({
    id: 1,
    title: "Cliente 1",
    businessArea: "audit",
    invoices: [
      { id: 10010125, date: "2024-01-10" },
      { id: 10212012, date: "2024-02-15" },
    ],
  }),
  createClientModel({
    id: 2,
    title: "Cliente 2",
    businessArea: "itAduit&RegulatoryCompliance",
    invoices: [
      { id: 0, date: "2024-03-01" },
      { id: 0, date: "2024-04-20" },
    ],
  }),
  createClientModel({
    id: 3,
    title: "Sandia 3",
    businessArea: "bpo",
    invoices: [],
  }),
];

const businessOptions = [
  { value: "audit", label: "Auditoria" },
  {
    value: "itAduit&RegulatoryCompliance",
    label: "Auditoria de TI y Cumplimiento Normativo",
  },
  { value: "bpo", label: "BPO" },
  { value: "corporateFinance", label: "Finanzas corporativas" },
  { value: "taxes", label: "Impuestos" },
  { value: "transferPricing", label: "Precios de Transferencia" },
  { value: "ras", label: "RAS" },
  { value: "businessConsulting", label: "Consultoria de Negocios" },
  { value: "itConsulting", label: "TI - Consultoria" },
  { value: "itAdministration", label: "TI - Administracion" },
  { value: "administration", label: "Administracion" },
  { value: "businessDevelopment", label: "Desarrollo de Negocios" },
];

const compareOptions = [
  { value: "", label: "Sin elegir" },
  { value: "thisMonth", label: "Este mes" },
  { value: "thisQuarter", label: "Este trimestre" },
  { value: "thisFourMonth", label: "Este cuatrimestre" },
  { value: "thisYear", label: "Este año" },
  { value: "lastMonth", label: "Último mes" },
  { value: "lastQuarter", label: "Último trimestre" },
  { value: "lastFourMonth", label: "Último cuatrimestre" },
  { value: "lastYear", label: "Último año" },
  { value: "monthToDate", label: "Mes hasta la fecha" },
  { value: "quarterToDate", label: "Trimestre hasta la fecha" },
  { value: "fourMonthToDate", label: "Cuatrimestre hasta la fecha" },
  { value: "yearToDate", label: "Año hasta la fecha" },
  { value: "custom", label: "Personalizado" },
];

//COMPONENTE//
const ClientsList = ({ onClientSelect }) => {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [activeClient, setActiveClient] = useState(null);
  const [businessFilter, setBusinessFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("az");

  // estado por cliente (filters + compare)
  const [clientState, setClientState] = useState({});

  //API//
  useEffect(() => {
    setClients(initialClients);  // aquí luego será "/api/clients"
  }, []);

  const updateClientState = useCallback((clientId, key, value) => {
    setClientState((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [key]: {
          ...(prev[clientId]?.[key] || {}),
          ...value,
        },
      },
    }));
  }, []);

  const getFilteredInvoices = useCallback(
    (clientId, invoices) => {
      const filters = clientState[clientId]?.filters;
      if (!filters) return invoices;

      return invoices.filter((inv) => {
        const date = new Date(inv.date);

        return (
          (!filters.dateFrom || date >= new Date(filters.dateFrom)) &&
          (!filters.dateTo || date <= new Date(filters.dateTo))
        );
      });
    },
    [clientState],
  );

  //FILTRO DE CLIENTES//
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(query.toLowerCase());

      const matchesBusiness =
        businessFilter === "" || c.businessArea === businessFilter;

      return matchesSearch && matchesBusiness;
    });
  }, [clients, query, businessFilter]);

  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients];

    if (sortOrder === "az") {
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sortOrder === "za") {
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    }

    return sorted;
  }, [filteredClients, sortOrder]);

  //INTERFAZ//
  return (
    <div className="clients-list">
      <h2 className="Title">Clientes</h2>

      <input
        className="searcher"
        type="search"
        placeholder="Buscar cliente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="filter-bar">
        <select
          className="general-filter-button"
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value)}
        >
          <option value="">Todas las áreas</option>
          {businessOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className="general-filter-button"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="az">A - Z</option>
          <option value="za">Z - A</option>
        </select>
      </div>

      <div className="clients-lenght">
        {sortedClients.length === 0 ? (
          <p className="no-results">No se encontraron facturas relacionadas</p>
        ) : (
          sortedClients.map((client) => {
            const filteredInvoices = getFilteredInvoices(
              client.id,
              client.invoices,
            );

            return (
              <div
                key={client.id}
                className="client-card"
                onClick={() => onClientSelect(client)}
              >
                <h3>{client.title}</h3>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveClient(
                      activeClient === client.id ? null : client.id,
                    );
                  }}
                >
                  Filtro
                </button>

                {activeClient === client.id && (
                  <div className="filter-panel">
                    <p>Rango de fechas:</p>

                    <div className="date-group">
                      <input
                        type="date"
                        onChange={(e) =>
                          updateClientState(client.id, "filters", {
                            dateFrom: e.target.value,
                          })
                        }
                      />

                      <input
                        type="date"
                        onChange={(e) =>
                          updateClientState(client.id, "filters", {
                            dateTo: e.target.value,
                          })
                        }
                      />
                    </div>

                    <p>Comparar con:</p>

                    <div className="compare-group">
                      <select
                        value={clientState[client.id]?.comparePeriod || ""}
                        onChange={(e) =>
                          updateClientState(
                            client.id,
                            "comparePeriod",
                            e.target.value,
                          )
                        }
                      >
                        {compareOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ClientsList;
