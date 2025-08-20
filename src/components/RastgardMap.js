import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import RecenterMap from "./RecenterMap";
import rastgardar from "../data/rastgardar.json";
import "leaflet/dist/leaflet.css";
import Legend from "./Legend";

const getId = (plats) =>
  plats.id ? String(plats.id) : `${plats.namn}-${plats.kommun}`;

function RastgardMap({ setView }) {
  const [userPosition, setUserPosition] = useState(null);
  const [filter, setFilter] = useState("");
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setUserPosition([position.coords.latitude, position.coords.longitude]),
      () => setUserPosition([59.3293, 18.0686])
    );
  }, []);

  const toggleFavorite = (plats) => {
    const favId = getId(plats);
    if (favorites.some((fav) => fav.id === favId)) {
      setFavorites(favorites.filter((fav) => fav.id !== favId));
    } else {
      setFavorites([
        ...favorites,
        {
          id: favId,
          namn: plats.namn,
          kommun: plats.kommun,
          län: plats.län,
        },
      ]);
    }
  };

  const blueIcon = new Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    iconSize: [30, 30],
  });
  const greenIcon = new Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    iconSize: [30, 30],
  });
  const redIcon = new Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
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
      {/* Sidebar */}
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

        <h3>❤️ Favoriter</h3>
        {favorites.length === 0 ? (
          <p>Inga favoriter</p>
        ) : (
          <ul>
            {favorites.map((fav) => (
              <li key={fav.id}>
                ❤️ {fav.namn} – {fav.kommun}, {fav.län}
              </li>
            ))}
          </ul>
        )}

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

      {/* Karta */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={userPosition}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap position={centerPosition} />

          {filter.trim() !== "" &&
            filtreradePlatser.map((plats) => (
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
                  <p>{plats.info}</p>
                  <button
                    onClick={() => toggleFavorite(plats)}
                    style={{
                      fontSize: "24px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {favorites.some((fav) => fav.id === getId(plats))
                      ? "❤️"
                      : "🤍"}
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
