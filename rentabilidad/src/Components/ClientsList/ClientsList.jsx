import React, { useState } from "react";
import "./ClientsList.css";

const Clients = [
  { id: 1, title: "Cliente 1" },
  { id: 2, title: "Cliente 2" },
  { id: 3, title: "Cliente 3" },
];

const ClientsList = () => {
  const [query, setQuery] = useState("");
  const [clientFilters, setClientFilters] = useState({});
  const [activeClient, setActiveClient] = useState(null);

  const filteredClients = Clients.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  const applyClientFilters = (client) => {
    const filters = clientFilters[client.id];

    if (!filters) return client.invoices;
    let results = [...client.invoices];

    if (filters.dateFrom && filters.dateTo) {
      results = results.filter((inv) => {
        const date = new Date(inv.date);
        return (
          date >= new Date(filters.dateFrom) &&
          date <= new Date(filters.dateTo)
        );
      });
    }

    return results;
  };

  const handleFilterChange = (clientId, field, value) => {
    const newFilters = {
      ...clientFilters,
      [clientId]: {
        ...clientFilters[clientId],
        [field]: value,
      },
    };

    setClientFilters(newFilters);
  };

  return (
    <div>
      <h2>Clientes</h2>

      <input
        type="text"
        placeholder="Buscar cliente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filteredClients.length === 0 ? (
        <p>No existen facturas a ese nombre</p>
      ) : (
        filteredClients.map((client) => {
          const filteredInvoices = applyClientFilters(client);

          return (
            <div key={client.id}>
              <h3>{client.title}</h3>

              <button
                onClick={() =>
                  setActiveClient(
                    activeClient === client.id ? null : client.id
                  )
                }
              >
                Filtro
              </button>

              {activeClient === client.id && (
                <div>
                  <p>Rango de fechas:</p>

                  <input
                    type="date"
                    onChange={(e) =>
                      handleFilterChange(
                        client.id,
                        "dateFrom",
                        e.target.value
                      )
                    }
                  />

                  <input
                    type="date"
                    onChange={(e) =>
                      handleFilterChange(
                        client.id,
                        "dateTo",
                        e.target.value
                      )
                    }
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ClientsList;
