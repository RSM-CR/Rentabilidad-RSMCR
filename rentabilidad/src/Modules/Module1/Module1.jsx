import Header from "../../Components/Header";
import { LoginSignup } from "../../Components/LoginSignup/LoginSignup";
import ClientsList from "../../Components/ClientsList/ClientsList";
import Clients from "../../Components/Clients/Clients";
import ProfitabilityResults from "../../Components/ProfitabilityResults/ProfitabilityResults";
import { CreateAccount } from "../../Components/CreateAccount/CreateAccount";
import FacturaFullView from "../../FacturaFullView/FacturaFullView";
import FacturaPrincipal from "../../Components/FacturaPrincipal/FacturaPrincipal";
import PrivateRoute from "../../utils/PrivateRoute";
import { BtnRegresar } from "../../Components/btn-regresar";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./Module1.css";
import { useState } from "react";

function Module1() {
  const [selectedClient, setSelectedClient] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}

        <Route
          path="/login"
          element={
            <div className="general-login">
              <div className="general-header">
                <Header />
              </div>
              <div className="general-login">
                <LoginSignup />
              </div>
            </div>
          }
        />

        <Route
          path="/"
          element={
            <div className="general-login">
              <div className="general-header">
                <Header />
              </div>
              <div className="general-login">
                <LoginSignup />
              </div>
            </div>
          }
        />
        <Route
          path="/createacc"
          element={
            <div className="general-newacc">
              <div className="general-header">
                <Header />
              </div>
              <div className="general-createacc">
                <CreateAccount />
              </div>
            </div>
          }
        />

        {/* Ruta privada */}
        <Route element={<PrivateRoute />}>
          <Route
            path="/clients"
            element={
              <>
                <div className="general-header">
                  <Header />
                </div>
                <div className="general">
                  <ClientsList onClientSelect={setSelectedClient} />
                  <div className="client-container">
                    <Clients client={selectedClient} />
                    <div className="results-container">
                      <ProfitabilityResults client={selectedClient} />
                    </div>
                  </div>
                </div>
              </>
            }
          />
=
          <Route
            path="/pruebas"
            element={ <BtnRegresar/>}
          />

          <Route path="/facturaP" element={<FacturaPrincipal />} />
          <Route path="/facturaFV/:id" element={<FacturaFullView />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default Module1;
