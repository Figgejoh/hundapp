import "../App.css";

function WelcomeScreen({ onSelect }) {
  return (
    <div className="welcome-screen">
      <h1>Välkommen!</h1>
      <h3>Välj vad du vill göra:</h3>
      <div className="card-container">
        <div className="card">
          <h2>Hundbadplatser</h2>
          <p>Hitta officiella och tillåtna badplatser för hundar.</p>
          <button onClick={() => onSelect("hundbad")}>Visa Hundbad</button>
        </div>
        <div className="card">
          <h2>Rastgårdar</h2>
          <p>Hitta rastgårdar där din hund kan leka fritt.</p>
          <button onClick={() => onSelect("rastgard")}>Visa Rastgårdar</button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
