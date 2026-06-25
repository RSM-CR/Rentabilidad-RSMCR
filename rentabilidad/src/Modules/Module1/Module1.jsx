import Header from "../../Components/Header";
import { LoginSignup } from "../../Components/LoginSignup/LoginSignup";
import ClientsList from "../../Components/ClientsList/ClientsList";
import Clients from "../../Components/Clients/Clients";
import ProfitabilityResults from "../..//Components/ProfitabilityResults/ProfitabilityResults";
import FacturaPrincipal from "../../Components/FacturaPrincipal/FacturaPrincipal";
import FacturaFullView from "../../Components/FacturaFullView/FacturaFullView";
import PrivateRoute from "../../utils/PrivateRoute";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./Module1.css";

function Module1() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginSignup />} />
        <Route path="/" element={<LoginSignup />} />

        {/* Ruta privada */}
        <Route element={<PrivateRoute />}>
          <Route
            path="/clients"
            element={
              <>
                <div className="general">
                  <ClientsList />
                  <div className="client-container">
                    <Clients />
                    <div className="results-container">
                      <ProfitabilityResults />
                    </div>
                  </div>
                </div>
              </>
            }
          />

          <Route path="/facturaP" element={<FacturaPrincipal />} />
          <Route path="/facturaFV/:id" element={<FacturaFullView />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default Module1;
