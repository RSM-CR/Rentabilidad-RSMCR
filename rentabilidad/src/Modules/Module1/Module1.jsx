import Header from '../../Components/Header';
import { LoginSignup } from '../../Components/LoginSignup/LoginSignup';
import ClientsList from '../../Components/ClientsList/ClientsList'; 
import './Module1.css';


function Module1() {
  return (
    <div className="App">
      <Header/>
      <LoginSignup/>
      <ClientsList/>
    </div>
  );
}

export default Module1;
