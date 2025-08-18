import { useEffect } from "react";
import { useMap } from "react-leaflet";

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 12);
    }
  }, [position, map]);
  return null;
}

export default RecenterMap;
