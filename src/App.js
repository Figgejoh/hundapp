import { useState } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import HundbadMap from "./components/HundbadMap";
import RastgardMap from "./components/RastgardMap";

function App() {
  const [view, setView] = useState("start"); // "start", "hundbad", "rastgard"

  if (view === "start") return <WelcomeScreen onSelect={setView} />;
  if (view === "hundbad") return <HundbadMap setView={setView} />;
  if (view === "rastgard") return <RastgardMap setView={setView} />;

  return null;
}

export default App;
