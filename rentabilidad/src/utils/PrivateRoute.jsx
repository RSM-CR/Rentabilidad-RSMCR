import { Navigate, Outlet } from "react-router-dom"; 

const PrivateRoute = () => {
  const isAuth = localStorage.getItem("token");
  return isAuth ? <Outlet /> : <Navigate to="/LoginSignup" />;
};

export default PrivateRoute;