import { Routes, Route } from "react-router-dom";
import Module1 from "./Modules/Module1/Module1";
import LoginSignup from "./Components/LoginSignup/LoginSignup";
import PrivateRoute from "./utils/PrivateRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginSignup />} />

      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Module1 />} />
      </Route>
    </Routes>
  );
}
