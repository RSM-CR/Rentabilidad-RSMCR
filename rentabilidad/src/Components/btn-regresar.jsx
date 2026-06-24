import "./btn-regresar.css";

export function BtnRegresar() {
  const regresar = () => {
    window.history.back();
  };

  return (
    <button className="btn-regresar" onClick={regresar}>
      Regresar
    </button>
  );
}