const FAVORITES_KEY = "hundplatser_favoriter";

export function getFavorites() {
  const favs = localStorage.getItem(FAVORITES_KEY);
  return favs ? JSON.parse(favs) : [];
}

export function addFavorite(id) {
  const favs = getFavorites();
  if (!favs.includes(id)) {
    favs.push(id);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  }
}

export function removeFavorite(id) {
  const favs = getFavorites();
  const updated = favs.filter((fav) => fav !== id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function loadFavorites() {
  const stored = localStorage.getItem("favorites");
  return stored ? JSON.parse(stored) : [];
}

export function saveFavorites(favs) {
  localStorage.setItem("favorites", JSON.stringify(favs));
}
