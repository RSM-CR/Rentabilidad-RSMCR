import Header from "../../Components/Header";
import { LoginSignup } from "../../Components/LoginSignup/LoginSignup";
import ClientsList from "../../Components/ClientsList/ClientsList";
import Clients from "../../Components/Clients/Clients";
import ProfitabilityResults from "../../Components/ProfitabilityResults/ProfitabilityResults";
import { CreateAccount } from "../../Components/CreateAccount/CreateAccount";
import PrivateRoute from "../../utils/PrivateRoute";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./Module1.css";

function Module1() {
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default Module1;
