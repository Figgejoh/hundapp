import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import RecenterMap from "./RecenterMap";
import rastgardar from "../data/rastgardar.json";
import "leaflet/dist/leaflet.css";

function RastgardMap({ setView }) {
  const [userPosition, setUserPosition] = useState(null);
  const [filter, setFilter] = useState("");
  const [favorites, setFavorites] = useState([]);

  // Hämta användarens position
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setUserPosition([position.coords.latitude, position.coords.longitude]),
      () => setUserPosition([59.3293, 18.0686]) // fallback Stockholm
    );
  }, []);

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((fav) => fav !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const greenIcon = new Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    iconSize: [30, 30],
  });

  const filtreradePlatser = rastgardar.filter(
    (plats) =>
      plats.kommun.toLowerCase().includes(filter.toLowerCase()) ||
      plats.namn.toLowerCase().includes(filter.toLowerCase()) ||
      plats.län.toLowerCase().includes(filter.toLowerCase())
  );

  const centerPosition =
    filtreradePlatser.length > 0 ? filtreradePlatser[0].position : userPosition;

  if (!userPosition) return <p>Laddar kartan...</p>;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        style={{ width: "300px", padding: "30px", backgroundColor: "#f0f0f0" }}
      >
        <h2>Rastgårdar</h2>
        <input
          type="text"
          placeholder="Sök kommun, län eller plats..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "95%", padding: "8px", marginBottom: "20px" }}
        />
        <button
          style={{
            width: "300px",
            padding: "20px",
            fontSize: "18px",
            cursor: "pointer",
            position: "absolute",
            bottom: "20px",
          }}
          onClick={() => setView("start")}
        >
          Tillbaka
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <MapContainer
          center={userPosition}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap position={centerPosition} />
          {filter &&
            filtreradePlatser.length > 0 &&
            filtreradePlatser.map((plats) => (
              <Marker key={plats.id} position={plats.position} icon={greenIcon}>
                <Popup>
                  <h3>{plats.namn}</h3>
                  <p>
                    <b>Kommun:</b> {plats.kommun}
                  </p>
                  <p>
                    <b>Län:</b> {plats.län}
                  </p>
                  <p>{plats.info}</p>
                  <button
                    onClick={() => toggleFavorite(plats.id)}
                    style={{
                      fontSize: "24px",
                      color: favorites.includes(plats.id) ? "red" : "gray",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {favorites.includes(plats.id) ? "❤️" : "🤍"}
                  </button>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default RastgardMap;
