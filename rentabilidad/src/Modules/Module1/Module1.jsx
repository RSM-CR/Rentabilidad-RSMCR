import Header from '../../Components/Header';
import { LoginSignup } from '../../Components/LoginSignup/LoginSignup';
import ClientsList from '../../Components/ClientsList/ClientsList'; 
import Clients from '../../Components/Clients/Clients';
import './Module1.css';


function Module1() {
  return (
    <div className="App">
      <Header/>
      <LoginSignup/>
      <div className="pruebas">
        <ClientsList/>
        <Clients/>
      </div>
    </div>  
  );
}

export default Module1;
  