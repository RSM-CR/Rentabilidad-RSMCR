import Header from "../../Components/Header";
import { LoginSignup } from "../../Components/LoginSignup/LoginSignup";
import ClientsList from "../../Components/ClientsList/ClientsList";
import Clients from "../../Components/Clients/Clients";
import ProfitabilityResults from "../..//Components/ProfitabilityResults/ProfitabilityResults";
import PrivateRoute from "../../utils/PrivateRoute";
import "./Module1.css";

function Module1() {
  return (
    <div className="App">
      <Header />

      <div className="pruebas">
        <ClientsList />
        <div className="up">
          <Clients />
          <div className="lower">
            <ProfitabilityResults />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Module1;
