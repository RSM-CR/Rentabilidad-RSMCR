import Header from "../../Components/Header";
import { LoginSignup } from "../../Components/LoginSignup/LoginSignup";
import ClientsList from "../../Components/ClientsList/ClientsList";
import Clients from "../../Components/Clients/Clients";
import ProfitabilityResults from "../..//Components/ProfitabilityResults/ProfitabilityResults";
import "./Module1.css";

function Module1() {
  return (
    <div className="App">
      <Header />
      <LoginSignup />
      <div className="pruebas">
        <ClientsList />

        <div class="up">
          <Clients></Clients>
          <div class="lower">
            <ProfitabilityResults></ProfitabilityResults>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Module1;
