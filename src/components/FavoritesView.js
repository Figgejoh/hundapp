import { isFavorite } from "../utils/favorites";

function FavoritesView({ setView, favorites }) {
  return (
    <div style={{ padding: "30px" }}>
      <h2>⭐ Mina Favoriter</h2>
      {favorites.length === 0 ? (
        <p>Du har inga favoriter ännu</p>
      ) : (
        <ul>
          {favorites.map((fav) => (
            <li key={fav.id}>
              <b>{fav.namn}</b> - {fav.kommun}, {fav.län}
            </li>
          ))}
        </ul>
      )}

      <button
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
        onClick={() => setView("start")}
      >
        Tillbaka
      </button>
    </div>
  );
}

export default FavoritesView;
