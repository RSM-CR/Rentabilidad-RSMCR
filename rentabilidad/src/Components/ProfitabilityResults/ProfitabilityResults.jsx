import React, { useState } from "react";
import "./ProfitabilityResults.css";
import logo_moreinfo from "../ProfitabilityResults/assets/moreInfo.png";

const ProfitabilityResults = () => {
  const [showInfo, setShowInfo] = useState(false);

  const invoiceProfitability = {
    charge: "0.00",
    expectedIncome: "0.00",
    realIncome: "0.00",
    hours: "100",

    projectedHours: "100 horas",
    realHours: "100 horas",

    overallProfitability: "0",
  };

  return (
    <div className="profitability-container">
      <div>
        <div>
          <strong>Cobro:</strong> {invoiceProfitability.charge}
        </div>

        <div>
          <strong>Ingreso OB:</strong> {invoiceProfitability.expectedIncome}
        </div>

        <div>
          <strong>Ingreso real:</strong> {invoiceProfitability.realIncome}
        </div>

        <div className="hours">
          <span>
            <strong>Horas:</strong> {invoiceProfitability.hours}
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
                {invoiceProfitability.projectedHours}
              </div>

              <div className="specific-hours">
                <strong>Horas reales:</strong> {invoiceProfitability.realHours}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="vertical-separator" />
      <div className="right-column">
        <div className="profitability-text">
          <strong>Rentabilidad:</strong>{" "}
          {invoiceProfitability.overallProfitability}%
        </div>

        <button className="See-graphic">Ver gráfico</button>
      </div>
    </div>
  );
};

export default ProfitabilityResults;
