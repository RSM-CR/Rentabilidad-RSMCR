import "./Header.css";

export default function Header({ username = "Nombre Usuario TEMPORAL" }) {
  return (
    <header className="header">
      <div className="header-title">
        RSM Rentabilidad
      </div>

      <div className="header-user">
        <span>{username}</span>
        <div className="header-avatar" />
      </div>
    </header>
  );
}