import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import hundbadplatser from "./hundbadplatser.json";
import rastgardar from "./rastgardar.json";
import { useState, useEffect } from "react";

// Komponent som centrera kartan
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 12);
    }
  }, [position, map]);
  return null;
}

// Välkomstskärm som kort
function WelcomeScreen({ onSelect }) {
  return (
    <div className="welcome-screen">
      <h1>Välkommen!</h1>
      <p>Välj vad du vill göra:</p>
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

function App() {
  const [view, setView] = useState("start"); // "start", "hundbad", "rastgard"
  const [filter, setFilter] = useState("");
  const [userPosition, setUserPosition] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setUserPosition([59.3293, 18.0686]);
      }
    );
  }, []);

  // Ikoner
  const greenIcon = new Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    iconSize: [30, 30],
  });
  const redIcon = new Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
    iconSize: [30, 30],
  });
  const blueIcon = new Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    iconSize: [30, 30],
  });

  const data =
    view === "hundbad" ? hundbadplatser : view === "rastgard" ? rastgardar : [];

  const filtreradePlatser = data.filter(
    (plats) =>
      plats.kommun.toLowerCase().includes(filter.toLowerCase()) ||
      plats.namn.toLowerCase().includes(filter.toLowerCase()) ||
      plats.län.toLowerCase().includes(filter.toLowerCase())
  );

  const centerPosition =
    filtreradePlatser.length > 0 ? filtreradePlatser[0].position : userPosition;

  // VISAR VÄLKOMSTSKÄRM
  if (view === "start") {
    return <WelcomeScreen onSelect={setView} />;
  }

  // KARTA
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Filterpanel */}
      <div
        style={{
          width: "300px",
          padding: "30px",
          backgroundColor: "#f0f0f0",
          boxShadow: "2px 0px 5px rgba(0,0,0,0.1)",
        }}
      >
        <h2>{view === "hundbad" ? "Bada med hunden" : "Rastgård"}</h2>
        <input
          type="text"
          placeholder="Sök kommun, län eller plats..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "95%", padding: "8px", marginBottom: "20px" }}
        />
        <button onClick={() => setView("start")} style={{ marginTop: "20px" }}>
          Tillbaka
        </button>
      </div>

      {/* Karta */}
      <div style={{ flex: 1 }}>
        {userPosition ? (
          <MapContainer
            center={userPosition}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <RecenterMap position={centerPosition} />

            {filtreradePlatser.map((plats) => (
              <Marker
                key={plats.id}
                position={plats.position}
                icon={
                  plats.officiell
                    ? blueIcon
                    : plats.tillåtet
                    ? greenIcon
                    : redIcon
                }
              >
                <Popup>
                  <h3>{plats.namn}</h3>
                  <p>
                    <b>Kommun:</b> {plats.kommun}
                  </p>
                  <p>
                    <b>Län:</b> {plats.län}
                  </p>
                  <p>
                    <b>Vatten:</b> {plats.vatten}
                  </p>
                  <p>{plats.info}</p>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <p>Laddar kartan...</p>
        )}
      </div>
    </div>
  );
}

export default App;
