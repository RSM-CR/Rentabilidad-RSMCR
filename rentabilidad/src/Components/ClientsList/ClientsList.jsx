import React, { useState, useEffect } from "react";
import "./ClientsList.css";

const Clients = [
  //lista temporal de clientes, cambiar a futuro con datos reales
  {
    id: 1,
    title: "Cliente 1",
    businessArea: "audit",
    invoices: [
      { id: 10010125, date: "2024-01-10" },
      { id: 10212012, date: "2024-02-15" },
    ],
  },

  {
    id: 2,
    title: "Cliente 2",
    businessArea: "itAduit&RegulatoryCompliance",
    invoices: [
      { id: 0, date: "2024-03-01" },
      { id: 0, date: "2024-04-20" },
    ],
  },
  { id: 3, title: "Sandia 3", businessArea: "bpo", invoices: [] },
  {
    id: 4,
    title: "Cliente 4",
    businessArea: "corporateFinance",
    invoices: [],
  },
  { id: 5, title: "Pollos 5", businessArea: "taxes", invoices: [] },
  { id: 6, title: "Chuletas 6", businessArea: "taxes", invoices: [] },
  { id: 7, title: "Cliente 7", businessArea: "ras", invoices: [] },
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

const ClientsList = () => {
  const [query, setQuery] = useState("");
  const [clientFilters, setClientFilters] = useState({});
  const [activeClient, setActiveClient] = useState(null);
  const [businessFilter, setBusinessFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("az");

  const filteredClients = Clients.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(query.toLowerCase());
    const matchesBusiness =
      businessFilter === "" || c.businessArea === businessFilter;

    return matchesSearch && matchesBusiness;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortOrder === "az") {
      return a.title.localeCompare(b.title);
    }

    if (sortOrder === "za") {
      return b.title.localeCompare(a.title);
    }

    return 0;
  });

  const applyClientFilters = (client) => {
    const filters = clientFilters[client.id];
    let results = [...(client.invoices || [])];

    if (!filters) return results;
    if (filters.dateFrom && filters.dateTo) {
      results = results.filter((inv) => {
        const date = new Date(inv.date);
        return (
          date >= new Date(filters.dateFrom) && date <= new Date(filters.dateTo)
        );
      });
    }
    return results;
  };

  const handleFilterChange = (clientId, field, value) => {
    setClientFilters({
      ...clientFilters,
      [clientId]: {
        ...clientFilters[clientId],
        [field]: value,
      },
    });
  };

  const [comparePeriod, setComparePeriod] = useState({});
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
            const filteredInvoices = applyClientFilters(client);

            return (
              <div key={client.id} className="client-card">
                <h3>{client.title}</h3>

                <button
                  onClick={() =>
                    setActiveClient(
                      activeClient === client.id ? null : client.id,
                    )
                  }
                >
                  Filtro
                </button>

                {activeClient === client.id && ( //filtro de fechas para cada cliente :v
                  <div className="filter-panel">
                    <p>Rango de fechas:</p>

                    <div className="date-group">
                      <input
                        type="date"
                        onChange={(e) =>
                          handleFilterChange(
                            client.id,
                            "dateFrom",
                            e.target.value,
                          )
                        }
                      />

                      <input
                        type="date"
                        onChange={(e) =>
                          handleFilterChange(
                            client.id,
                            "dateTo",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <p>Comparar con:</p>

                    <div className="compare-group">
                      <select
                        value={comparePeriod[client.id] || ""}
                        onChange={(e) =>
                          setComparePeriod({
                            ...comparePeriod,
                            [client.id]: e.target.value,
                          })
                        }
                      >
                        {compareOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {comparePeriod[client.id] === "custom" && (
                        <div className="date-group">
                          <input type="date" />
                          <input type="date" />
                        </div>
                      )}
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
