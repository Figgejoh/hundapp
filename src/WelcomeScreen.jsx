import React from "react";
import "./WelcomeScreen.css";

function WelcomeScreen({ onSelect }) {
  return (
    <div className="welcome-screen">
      <h1>Välkommen!</h1>
      <div className="cards-container">
        <div className="card">
          <h2>Bada med hunden</h2>
          <p>Hitta badplatser nära dig.</p>
          <button onClick={() => onSelect("hundbad")}>Utforska</button>
        </div>
        <div className="card">
          <h2>Rastgård</h2>
          <p>Hitta rastgårdar i din kommun.</p>
          <button onClick={() => onSelect("rastgard")}>Utforska</button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
