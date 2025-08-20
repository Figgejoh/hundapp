import { useEffect, useState } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import HundbadMap from "./components/HundbadMap";
import RastgardMap from "./components/RastgardMap";
import FavoritesView from "./components/FavoritesView";
import { loadFavorites, saveFavorites } from "./utils/favorites";

function App() {
  const [view, setView] = useState("start"); // "start", "hundbad", "rastgard"
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  if (view === "start") return <WelcomeScreen onSelect={setView} />;
  if (view === "hundbad") return <HundbadMap setView={setView} />;
  if (view === "rastgard") return <RastgardMap setView={setView} />;

  return null;
}

export default App;
