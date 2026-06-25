import React, { useState } from "react";
import "./ProfitabilityResults.css";
import logo_moreinfo from "../ProfitabilityResults/assets/moreInfo.png";

const ProfitabilityResults = ({ client }) => {
  const [showInfo, setShowInfo] = useState(false);

  if (!client) return null;

  const profitability = client.profitability;
  return (
    <div className="profitability-container">
      <div>
        <div>
          <strong>Cobro:</strong> {profitability.charge}
        </div>

        <div>
          <strong>Ingreso OB:</strong> {profitability.expectedIncome}
        </div>

        <div>
          <strong>Ingreso real:</strong> {profitability.realIncome}
        </div>

        <div className="hours">
          <span>
            <strong>Horas:</strong> {profitability.hours}
          </span>

          <img
            className="logo-moreInfo"
            src={logo_moreinfo}
            alt="Más información"
            onClick={() => setShowInfo(!showInfo)}
          />

          {showInfo && (
            <div className="show-hours">
              <div className="specific-hours">
                <strong>Horas proyectadas:</strong>{" "}
                {profitability.projectedHours}
              </div>

              <div className="specific-hours">
                <strong>Horas reales:</strong> {profitability.realHours}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="vertical-separator" />
      <div className="right-column">
        <div className="profitability-text">
          <strong>Rentabilidad:</strong> {profitability.overallProfitability}%
        </div>

        <button className="See-btn">Ver gráfico</button>
        <button className="See-btn">Ver facturas</button>
      </div>
    </div>
  );
};

export default ProfitabilityResults;
