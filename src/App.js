import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import hundbadplatser from "./hundbadplatser.json";
import { useState, useEffect } from "react";

// Komponent för att centrera kartan på en position
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 9);
    }
  }, [position, map]);
  return null;
}

function App() {
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

  const [filter, setFilter] = useState("");
  const [userPosition, setUserPosition] = useState(null);

  // Hämta användarens position
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // fallback om position inte kan hämtas
        setUserPosition([59.3293, 18.0686]);
      }
    );
  }, []);

  // Filtrera platser baserat på sökfält
  const filtreradePlatser = hundbadplatser.filter(
    (plats) =>
      plats.kommun.toLowerCase().includes(filter.toLowerCase()) ||
      plats.namn.toLowerCase().includes(filter.toLowerCase()) ||
      plats.län.toLowerCase().includes(filter.toLowerCase())
  );

  // Center-position: antingen första matchande plats eller användarens position
  const centerPosition =
    filtreradePlatser.length > 0 ? filtreradePlatser[0].position : userPosition;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Filterpanel */}
      <div
        style={{
          width: "300px",
          padding: "30px",
          backgroundColor: "#f0f0f0",
          boxShadow: "2px 0px 5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2>Bada med hunden</h2>
        <h2>Filtrera</h2>
        <input
          type="text"
          placeholder="Sök kommun, län eller plats..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "95%", padding: "8px", marginBottom: "20px" }}
        />
        <div style={{ marginTop: "20px" }}>
          <h3>Legend</h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <img
              src="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
              alt="blue"
              width={20}
            />
            <span style={{ marginLeft: "8px" }}>Officiell hundbadplats</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <img
              src="https://maps.google.com/mapfiles/ms/icons/green-dot.png"
              alt="green"
              width={20}
            />
            <span style={{ marginLeft: "8px" }}>Tillåtet med hund</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <img
              src="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
              alt="red"
              width={20}
            />
            <span style={{ marginLeft: "8px" }}>Inte tillåtet med hund</span>
          </div>
        </div>
      </div>

      {/* Karta */}
      <div style={{ flex: 1 }}>
        {userPosition ? (
          <MapContainer
            center={centerPosition}
            zoom={20}
            style={{ height: "100vh", width: "100%" }}
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
          <p>Laddar karta och hämtar position...</p>
        )}
      </div>
    </div>
  );
}

export default App;
