<script>
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import AuthModal from "$lib/components/AuthModal.svelte";
  import dogBeaches from "$lib/data/dogBeaches.json";
  import { distanceInKm } from "$lib/utils/distance";
  import { supabase } from "$lib/supabase";

  let map;
  let L;
  let loading = true;

  let userLatLng = null;
  let beachMarkers = [];

  let userMarker;
  let pulseCircle;
  let currentLatLng = null;
  let pulseInterval;

  let selectedBeach = null;
  let searchQuery = "";
  let onlyDogFriendly = false;
  let onlyFavorites = false;
  let radius = 30;
  let showFilters = false;

  let favorites = new Set();
  let locationError = null;
  let locating = false;
  let clusterGroup = null;
  let onlyParking = false;
  let shareToast = false;

  // Auth
  let currentUser = null;
  let showAuthModal = false;

  // Foton
  let beachPhotos = [];
  let uploadingPhoto = false;

  // --------------------
  // Kommentarer & rapporter
  // --------------------

  let comments = [];
  let newComment = "";
  let commentLoading = false;
  let showReportModal = false;
  let reportReason = "";
  let reportSent = false;

  let avgRating = null;
  let ratingCount = 0;
  let hoveredStar = 0;

  async function loadRatings(beachId) {
    avgRating = null;
    ratingCount = 0;
    const { data } = await supabase
      .from("ratings")
      .select("rating")
      .eq("beach_id", beachId);
    if (data && data.length > 0) {
      ratingCount = data.length;
      avgRating = data.reduce((sum, r) => sum + r.rating, 0) / ratingCount;
    }
  }

  async function submitRating(star) {
    await supabase.from("ratings").insert({ beach_id: selectedBeach.id, rating: star });
    await loadRatings(selectedBeach.id);
  }

  async function loadComments(beachId) {
    comments = [];
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("beach_id", beachId)
      .order("created_at", { ascending: false });
    comments = data ?? [];
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    commentLoading = true;
    await supabase.from("comments").insert({ beach_id: selectedBeach.id, text: newComment.trim() });
    newComment = "";
    await loadComments(selectedBeach.id);
    commentLoading = false;
  }

  async function submitReport() {
    if (!reportReason.trim()) return;
    await supabase.from("reports").insert({ beach_id: selectedBeach.id, reason: reportReason.trim() });
    reportReason = "";
    reportSent = true;
    setTimeout(() => { showReportModal = false; reportSent = false; }, 2000);
  }

  async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
  }

  async function loadPhotos(beachId) {
    beachPhotos = [];
    const { data } = await supabase
      .from("photos")
      .select("url, created_at")
      .eq("beach_id", beachId)
      .order("created_at", { ascending: false })
      .limit(5);
    beachPhotos = data ?? [];
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    uploadingPhoto = true;
    const ext = file.name.split('.').pop();
    const path = `${selectedBeach.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("beach-photos").upload(path, file, { upsert: false });
    if (upErr) { uploadingPhoto = false; return; }
    const { data: { publicUrl } } = supabase.storage.from("beach-photos").getPublicUrl(path);
    await supabase.from("photos").insert({ beach_id: selectedBeach.id, url: publicUrl, user_id: currentUser.id });
    await loadPhotos(selectedBeach.id);
    uploadingPhoto = false;
    e.target.value = '';
  }

  function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify([...favorites]));
  }

  function toggleFavorite(id) {
    if (favorites.has(id)) {
      favorites.delete(id);
    } else {
      favorites.add(id);
    }
    favorites = new Set(favorites);
    saveFavorites();
  }

  // --------------------
  // Marker icon
  // --------------------

  function beachIcon(dogAllowed) {
    const color = dogAllowed ? "#4CAF50" : "#f44336";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26S28 24.5 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`;
    return L.divIcon({
      className: "",
      html: svg,
      iconSize: [28, 40],
      iconAnchor: [14, 40]
    });
  }

  // --------------------
  // Smooth movement
  // --------------------

  function smoothMove(marker, from, to, duration = 400) {
    if (!from) return;
    const start = performance.now();
    function animate(time) {
      const p = Math.min((time - start) / duration, 1);
      marker.setLatLng([
        from.lat + (to.lat - from.lat) * p,
        from.lng + (to.lng - from.lng) * p
      ]);
      if (p < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // --------------------
  // Show nearby beaches
  // --------------------

  function goToNearest() {
    if (!userLatLng || !map || !L) return;
    const nearest = dogBeaches
      .filter(b => b.dogAllowed)
      .map(b => ({ ...b, distance: distanceInKm(userLatLng.lat, userLatLng.lng, b.lat, b.lng) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest) return;
    selectedBeach = nearest;
    map.setView([nearest.lat, nearest.lng], 14, { animate: true });
  }

  function clearMarkers() {
    if (clusterGroup) {
      clusterGroup.clearLayers();
    } else {
      beachMarkers.forEach(m => map.removeLayer(m));
    }
    beachMarkers = [];
  }

  function addBeachMarker(beach, dist = null) {
    const marker = L.marker([beach.lat, beach.lng], { icon: beachIcon(beach.dogAllowed) });
    marker.on("click", () => {
      selectedBeach = { ...beach, distance: dist };
      map.setView([beach.lat, beach.lng], 16, { animate: true });
      loadComments(beach.id);
      loadRatings(beach.id);
      loadPhotos(beach.id);
    });
    if (clusterGroup) {
      clusterGroup.addLayer(marker);
    } else {
      marker.addTo(map);
    }
    beachMarkers.push(marker);
    return marker;
  }

  function showAllBeaches() {
    if (!map || !L) return;
    clearMarkers();
    dogBeaches.forEach(beach => addBeachMarker(beach));
  }

  function showNearbyBeaches(radiusKm = radius) {
    if (!userLatLng || !map || !L) return;

    clearMarkers();

    const bounds = [[userLatLng.lat, userLatLng.lng]];

    let filtered = dogBeaches;
    if (onlyDogFriendly) filtered = filtered.filter(b => b.dogAllowed);
    if (onlyFavorites)   filtered = filtered.filter(b => favorites.has(b.id));
    if (onlyParking)     filtered = filtered.filter(b => b.parking);

    filtered.forEach(beach => {
      const dist = distanceInKm(userLatLng.lat, userLatLng.lng, beach.lat, beach.lng);
      if (dist > radiusKm) return;
      addBeachMarker(beach, dist);
      bounds.push([beach.lat, beach.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }

  // --------------------
  // Pulsing circle
  // --------------------

  function startPulse() {
    let radius = 18;
    let grow = true;
    pulseInterval = setInterval(() => {
      if (!pulseCircle) return;
      radius += grow ? 0.6 : -0.6;
      if (radius > 30) grow = false;
      if (radius < 18) grow = true;
      pulseCircle.setRadius(radius);
      pulseCircle.setStyle({ fillOpacity: 0.15 + (radius - 18) / 40 });
    }, 30);
  }

  // --------------------
  // Search
  // --------------------

  function handleSearch() {
    if (!map || !L || !searchQuery) return;

    clearMarkers();

    let results = dogBeaches.filter(
      b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (onlyDogFriendly) results = results.filter(b => b.dogAllowed);
    if (onlyFavorites)   results = results.filter(b => favorites.has(b.id));
    if (onlyParking)     results = results.filter(b => b.parking);
    if (!results.length) return;

    if (userLatLng) {
      results = results
        .map(b => ({ ...b, distance: distanceInKm(userLatLng.lat, userLatLng.lng, b.lat, b.lng) }))
        .sort((a, b) => a.distance - b.distance);
    }

    const bounds = [];
    results.forEach(beach => {
      const dist = beach.distance ?? null;
      addBeachMarker(beach, dist);
      bounds.push([beach.lat, beach.lng]);
    });

    map.fitBounds(bounds, { padding: [50, 50] });
  }

  // --------------------
  // Escape key
  // --------------------

  async function shareBeach() {
    const url = `https://www.google.com/maps?q=${selectedBeach.lat},${selectedBeach.lng}`;
    const text = `Kolla in ${selectedBeach.name}${selectedBeach.city ? ' i ' + selectedBeach.city : ''}!`;
    if (navigator.share) {
      await navigator.share({ title: selectedBeach.name, text, url });
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      shareToast = true;
      setTimeout(() => shareToast = false, 2500);
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") selectedBeach = null;
  }

  // --------------------
  // Mount / Destroy
  // --------------------

  onDestroy(() => {
    if (pulseInterval) clearInterval(pulseInterval);
    if (browser) window.removeEventListener("keydown", handleKeydown);
  });

  onMount(async () => {
    window.addEventListener("keydown", handleKeydown);

    favorites = new Set(JSON.parse(localStorage.getItem("favorites") ?? "[]"));

    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    supabase.auth.onAuthStateChange((_, session) => {
      currentUser = session?.user ?? null;
    });

    L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");

    map = L.map("map", { zoomControl: false }).setView([59.3293, 18.0686], 6);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    loading = false;

    try {
      window.L = L.default ?? L;
      await import("leaflet.markercluster");
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
      clusterGroup = window.L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60 });
      map.addLayer(clusterGroup);
    } catch (e) {
      console.warn("Marker clustering ej tillgänglig:", e);
    }

    const dogIcon = L.icon({
      iconUrl: "/icons/dog.png",
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    function onPosition(pos) {
      locationError = null;
      locating = false;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const newLatLng = L.latLng(lat, lng);
      userLatLng = { lat, lng };

      if (!userMarker) {
        userMarker = L.marker(newLatLng, { icon: dogIcon }).addTo(map);
        pulseCircle = L.circleMarker(newLatLng, {
          radius: 20,
          color: "#4CAF50",
          fillColor: "#4CAF50",
          fillOpacity: 0.3,
          weight: 0
        }).addTo(map);
        currentLatLng = newLatLng;
        startPulse();
        map.setView(newLatLng, 12);
        showNearbyBeaches(radius);
      } else {
        smoothMove(userMarker, currentLatLng, newLatLng);
        smoothMove(pulseCircle, currentLatLng, newLatLng);
        currentLatLng = newLatLng;
      }
    }

    function onLocationError(err) {
      locating = false;
      locationError = err.code === 1
        ? "Platstillgång nekad. Tillåt plats i webbläsaren och försök igen."
        : "Kunde inte hämta din plats.";
      showAllBeaches();
    }

    if ("geolocation" in navigator) {
      locating = true;
      navigator.geolocation.watchPosition(onPosition, onLocationError, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      locationError = "Din webbläsare stöder inte platsfunktionen.";
      showAllBeaches();
    }
  });
</script>

<!-- LADDNINGSINDIKATOR -->
{#if loading}
  <div class="loader-overlay">
    <div class="spinner"></div>
  </div>
{/if}

<!-- MAP -->
<div id="map"></div>

<!-- KONTROLLER -->
<div class="controls">
  <div class="search-row">
    <SearchBar bind:value={searchQuery} onSearch={handleSearch} />
    <button
      class="icon-btn {showFilters ? 'active' : ''}"
      onclick={() => showFilters = !showFilters}
      title="Filter"
    >
      ⚙︎
    </button>
  </div>

  {#if showFilters}
    <div class="filter-panel">
      <label class="toggle-row">
        <span><img src="/icons/dog.png" alt="" class="filter-icon" /> Bara hundvänliga</span>
        <input type="checkbox" bind:checked={onlyDogFriendly} onchange={() => {
          if (userLatLng) showNearbyBeaches(radius);
          else if (searchQuery) handleSearch();
        }} />
      </label>

      <label class="toggle-row">
        <span>★ Bara favoriter</span>
        <input type="checkbox" bind:checked={onlyFavorites} onchange={() => {
          if (userLatLng) showNearbyBeaches(radius);
          else if (searchQuery) handleSearch();
        }} />
      </label>

      <label class="toggle-row">
        <span>🚗 Med parkering</span>
        <input type="checkbox" bind:checked={onlyParking} onchange={() => {
          if (userLatLng) showNearbyBeaches(radius);
          else if (searchQuery) handleSearch();
        }} />
      </label>

      {#if userLatLng}
        <div class="toggle-row">
          <span>Radie: {radius} km</span>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            bind:value={radius}
            onchange={() => showNearbyBeaches(radius)}
          />
        </div>

        <button class="nearest-btn" onclick={() => { showFilters = false; goToNearest(); }}>
          📍 Visa närmaste hundvänliga
        </button>
      {/if}
    </div>
  {/if}
</div>

{#if locationError}
  <div class="location-error">
    <span>📍 {locationError}</span>
    <button onclick={() => {
      locationError = null;
      locating = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationError = null;
          locating = false;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          userLatLng = { lat, lng };
          map.setView([lat, lng], 12, { animate: true });
          showNearbyBeaches(radius);
        },
        () => {
          locating = false;
          locationError = "Platstillgång nekad. Kontrollera webbläsarens inställningar.";
        }
      );
    }}>Försök igen</button>
  </div>
{/if}

<!-- AUTH-KNAPP -->
<div class="auth-btn-wrap">
  {#if currentUser}
    <div class="user-chip">
      <span>👤 {currentUser.email?.split('@')[0]}</span>
      <button onclick={logout}>Logga ut</button>
    </div>
  {:else}
    <button class="login-btn" onclick={() => showAuthModal = true}>Logga in</button>
  {/if}
</div>

<!-- LEGEND -->
<div class="legend">
  <span class="dot green"></span> Hundar tillåtna
  <span class="dot red"></span> Ej tillåtna
</div>

<!-- SIDE PANEL -->
{#if selectedBeach}
  <div class="info-panel">

    {#if beachPhotos.length > 0}
      <div class="photo-strip">
        {#each beachPhotos as photo}
          <img src={photo.url} alt={selectedBeach.name} class="strip-photo" />
        {/each}
      </div>
    {:else}
      <img src={selectedBeach.image ?? '/images/placeholder.svg'} alt={selectedBeach.name} />
    {/if}

    <div class="panel-body">
      <div class="panel-header">
        <h2>{selectedBeach.name}</h2>
        <button
          class="fav-btn {favorites.has(selectedBeach.id) ? 'active' : ''}"
          onclick={() => toggleFavorite(selectedBeach.id)}
          title={favorites.has(selectedBeach.id) ? 'Ta bort favorit' : 'Spara som favorit'}
        >
          {favorites.has(selectedBeach.id) ? '★' : '☆'}
        </button>
      </div>

      <p>{selectedBeach.city}</p>

      <div class="rating-row">
        <div class="stars">
          {#each [1,2,3,4,5] as star}
            <button
              class="star {(hoveredStar || (avgRating !== null ? Math.round(avgRating) : 0)) >= star ? 'filled' : ''}"
              onmouseenter={() => hoveredStar = star}
              onmouseleave={() => hoveredStar = 0}
              onclick={() => submitRating(star)}
            >★</button>
          {/each}
        </div>
        {#if avgRating !== null}
          <span class="rating-label">{avgRating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'betyg' : 'betyg'})</span>
        {:else}
          <span class="rating-label">Inget betyg än</span>
        {/if}
      </div>

      <p class="info-row">
        {selectedBeach.dogAllowed ? "🐶 Hundar tillåtna" : "🚫 Hundar ej tillåtna"}
      </p>

      {#if selectedBeach.distance}
        <p class="info-row">📏 {selectedBeach.distance.toFixed(1)} km bort</p>
      {/if}

      {#if selectedBeach.parking !== undefined}
        <p class="info-row">🚗 Parkering: {selectedBeach.parking ? "Ja" : "Nej"}</p>
      {/if}


      <!-- KOMMENTARER -->
      <div class="comments-section">
        <h3>Kommentarer</h3>

        {#if comments.length === 0}
          <p class="no-comments">Inga kommentarer än — bli den första!</p>
        {:else}
          {#each comments as c}
            <div class="comment">
              <p>{c.text}</p>
              <span>{new Date(c.created_at).toLocaleDateString("sv-SE")}</span>
            </div>
          {/each}
        {/if}

        <div class="comment-input">
          <textarea
            placeholder="Skriv en kommentar..."
            bind:value={newComment}
            rows="2"
          ></textarea>
          <button onclick={submitComment} disabled={commentLoading || !newComment.trim()}>
            {commentLoading ? "Skickar..." : "Skicka"}
          </button>
        </div>
      </div>

      <div class="panel-buttons">
        <a
          class="algae-warning"
          href={`https://www.google.com/search?q=algblomning+${encodeURIComponent(selectedBeach.city)}+${new Date().getFullYear()}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          ⚠️ Sök algblomning nära {selectedBeach.city}
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBeach.lat},${selectedBeach.lng}`}
          target="_blank"
        >
          Vägbeskrivning
        </a>

        {#if userLatLng}
          <button class="back-btn" onclick={() => {
            selectedBeach = null;
            map.setView([userLatLng.lat, userLatLng.lng], 12, { animate: true });
            showNearbyBeaches(30);
          }}>
            Tillbaka till min plats
          </button>
        {/if}

        <button class="share-btn" onclick={shareBeach}>
          🔗 Dela badplats
        </button>

        {#if currentUser}
          <label class="upload-btn">
            {uploadingPhoto ? '⏳ Laddar upp...' : '📷 Ladda upp bild'}
            <input type="file" accept="image/*" onchange={uploadPhoto} style="display:none" />
          </label>
        {:else}
          <button class="upload-btn" onclick={() => showAuthModal = true}>
            📷 Ladda upp bild (logga in)
          </button>
        {/if}

        <button class="report-btn" onclick={() => { showReportModal = true; reportSent = false; }}>
          🚩 Rapportera felaktig info
        </button>

        <button onclick={() => selectedBeach = null}>
          Stäng
        </button>
      </div>
    </div>

  </div>
{/if}

{#if shareToast}
  <div class="toast">✅ Länk kopierad!</div>
{/if}

{#if showAuthModal}
  <AuthModal
    onClose={() => showAuthModal = false}
    onAuth={(user) => currentUser = user}
  />
{/if}

<!-- RAPPORTMODAL -->
{#if showReportModal}
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => showReportModal = false}
    onkeydown={(e) => e.key === 'Escape' && (showReportModal = false)}
  >
    <div
      class="modal"
      role="dialog"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      {#if reportSent}
        <p class="report-thanks">✅ Tack för din rapport!</p>
      {:else}
        <h3>Rapportera felaktig info</h3>
        <p>Vad stämmer inte om <strong>{selectedBeach?.name}</strong>?</p>
        <textarea
          placeholder="Beskriv vad som är fel..."
          bind:value={reportReason}
          rows="3"
        ></textarea>
        <div class="modal-buttons">
          <button class="modal-cancel" onclick={() => showReportModal = false}>Avbryt</button>
          <button class="modal-submit" onclick={submitReport} disabled={!reportReason.trim()}>
            Skicka rapport
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  #map {
    width: 100%;
    height: 100vh;
  }

  /* Loader */
  .loader-overlay {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .spinner {
    width: 44px;
    height: 44px;
    border: 4px solid rgba(0,0,0,0.1);
    border-top-color: #4CAF50;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Kontroller */
  .controls {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 85%;
    max-width: 420px;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .icon-btn {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;
    color: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn.active {
    background: rgba(76, 175, 80, 0.85);
    border-color: rgba(76, 175, 80, 0.4);
    color: white;
    box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
  }

  .filter-panel {
    width: 100%;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 18px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 15px;
    font-weight: 600;
    color: #333;
    cursor: pointer;
    gap: 8px;
    line-height: 1.5;
  }

  .toggle-row span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toggle-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #4CAF50;
    cursor: pointer;
    flex-shrink: 0;
  }

  .toggle-row input[type="range"] {
    width: 120px;
    accent-color: #4CAF50;
    cursor: pointer;
  }

  .nearest-btn {
    width: 100%;
    padding: 11px;
    border-radius: 50px;
    border: 1px solid rgba(76, 175, 80, 0.3);
    background: rgba(76, 175, 80, 0.12);
    color: #2e7d32;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .nearest-btn:hover {
    background: rgba(76, 175, 80, 0.22);
  }

  .filter-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }

  /* Location error */
  .location-error {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(244, 67, 54, 0.3);
    border-radius: 50px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #c62828;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    white-space: nowrap;
  }

  .location-error button {
    padding: 4px 12px;
    border-radius: 50px;
    border: none;
    background: #f44336;
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  @media (max-width: 600px) {
    .location-error {
      white-space: normal;
      text-align: center;
      border-radius: 16px;
      bottom: 80px;
      width: 85%;
    }
  }

  /* Legend */
  .legend {
    position: fixed;
    bottom: 24px;
    left: 14px;
    padding: 8px 14px;
    border-radius: 50px;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    font-size: 12px;
    font-weight: 500;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #1a1a1a;
  }

  .dot {
    display: inline-block;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  }

  .dot.green { background: #4CAF50; }
  .dot.red   { background: #f44336; }

  /* Side panel */
  .info-panel {
    position: fixed;
    right: 0;
    top: 0;
    width: 330px;
    height: 100vh;
    padding: 0;
    overflow-y: auto;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-left: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.15);
  }

  .info-panel img {
    width: calc(100% - 32px);
    height: 200px;
    object-fit: cover;
    display: block;
    margin: 16px 16px 0;
    border-radius: 16px;
  }

  @media (max-width: 600px) {
    .info-panel {
      width: 100%;
      height: 100vh;
      top: 0;
      bottom: 0;
      right: 0;
      border-left: none;
      border-top: none;
      box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.15);
      border-radius: 0;
    }

    .controls {
      width: calc(100% - 70px);
      max-width: none;
    }

    .filter-panel {
      max-height: calc(100vh - 120px);
      overflow-y: auto;
    }

    .search-row {
      font-size: 13px;
    }

    .legend {
      bottom: 12px;
      left: 10px;
    }
  }

  .panel-body {
    padding: 18px 20px 24px;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
    letter-spacing: -0.3px;
  }

  .fav-btn {
    background: none;
    border: none;
    font-size: 26px;
    cursor: pointer;
    color: #ccc;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .fav-btn.active {
    color: #f5a623;
  }

  .panel-body p {
    margin: 8px 0;
    font-size: 15px;
    color: #333;
    line-height: 1.5;
  }

  .panel-body .info-row {
    font-weight: 600;
  }

  .panel-body > p:first-of-type {
    font-size: 14px;
    color: #888;
    margin-top: 2px;
    margin-bottom: 10px;
  }

  .algae-warning {
    display: block;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255, 183, 0, 0.12);
    border: 1px solid rgba(255, 183, 0, 0.4);
    color: #b45309;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    text-align: center;
    transition: background 0.15s;
  }

  .algae-warning:hover {
    background: rgba(255, 183, 0, 0.22);
  }

  .panel-body a {
    display: block;
    padding: 11px;
    border-radius: 50px;
    background: rgba(66, 133, 244, 0.12);
    border: 1px solid rgba(66, 133, 244, 0.25);
    color: #4285f4;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    text-align: center;
    transition: background 0.15s;
  }

  .panel-body a:hover {
    background: rgba(66, 133, 244, 0.2);
  }

  .panel-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }

  .panel-buttons button {
    width: 100%;
    padding: 11px;
    border-radius: 50px;
    border: 1px solid rgba(0,0,0,0.1);
    background: rgba(255,255,255,0.6);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    color: #1a1a1a;
  }

  .back-btn {
    background: rgba(76, 175, 80, 0.15) !important;
    border-color: rgba(76, 175, 80, 0.3) !important;
    color: #2e7d32 !important;
  }

  .panel-buttons button:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  .back-btn:hover {
    background: rgba(76, 175, 80, 0.25) !important;
  }

  /* Betyg */
  .rating-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 10px;
  }

  .stars {
    display: flex;
    gap: 2px;
  }

  .star {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #ddd;
    padding: 0;
    line-height: 1;
    transition: color 0.1s, transform 0.1s;
  }

  .star.filled {
    color: #f5a623;
  }

  .star:hover {
    transform: scale(1.2);
  }

  .rating-label {
    font-size: 13px;
    color: #888;
    font-weight: 500;
  }

  /* Kommentarer */
  .comments-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(0,0,0,0.08);
  }

  .comments-section h3 {
    font-size: 16px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 10px;
  }

  .no-comments {
    font-size: 14px;
    color: #aaa;
    margin: 0 0 12px;
  }

  .comment {
    background: rgba(0,0,0,0.04);
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 8px;
  }

  .comment p {
    margin: 0 0 4px;
    font-size: 14px;
    color: #333;
    line-height: 1.4;
  }

  .comment span {
    font-size: 12px;
    color: #aaa;
  }

  .comment-input {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }

  .comment-input textarea {
    width: 100%;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    resize: none;
    background: rgba(255,255,255,0.6);
    backdrop-filter: blur(8px);
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
  }

  .comment-input button {
    align-self: flex-end;
    padding: 8px 20px;
    border-radius: 50px;
    border: none;
    background: #4CAF50;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .comment-input button:disabled {
    background: #ccc;
    cursor: default;
  }

  /* Rapportknapp */
  .report-btn {
    background: rgba(244, 67, 54, 0.08) !important;
    border-color: rgba(244, 67, 54, 0.25) !important;
    color: #c62828 !important;
  }

  .report-btn:hover {
    background: rgba(244, 67, 54, 0.15) !important;
  }

  .share-btn {
    background: rgba(76, 175, 80, 0.08) !important;
    border-color: rgba(76, 175, 80, 0.25) !important;
    color: #2e7d32 !important;
  }

  .share-btn:hover {
    background: rgba(76, 175, 80, 0.18) !important;
  }

  /* Auth */
  .auth-btn-wrap {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1001;
  }

  .login-btn {
    padding: 8px 18px;
    border-radius: 50px;
    border: 1px solid rgba(255,255,255,0.7);
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    color: #1a1a1a;
    transition: background 0.15s;
  }

  .login-btn:hover {
    background: rgba(255,255,255,0.8);
  }

  .user-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 50px;
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.7);
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .user-chip button {
    padding: 3px 10px;
    border-radius: 50px;
    border: 1px solid rgba(0,0,0,0.12);
    background: transparent;
    font-size: 12px;
    cursor: pointer;
    color: #555;
  }

  /* Foton */
  .photo-strip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 16px 16px 0;
    scrollbar-width: none;
  }

  .photo-strip::-webkit-scrollbar { display: none; }

  .strip-photo {
    flex-shrink: 0;
    width: 220px;
    height: 160px;
    object-fit: cover;
    border-radius: 12px;
  }

  .upload-btn {
    width: 100%;
    padding: 11px;
    border-radius: 50px;
    border: 1px solid rgba(0,0,0,0.1);
    background: rgba(255,255,255,0.6);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    color: #1a1a1a;
    text-align: center;
    display: block;
    transition: background 0.15s;
  }

  .upload-btn:hover {
    background: rgba(0,0,0,0.06);
  }

  @media (max-width: 600px) {
    .auth-btn-wrap {
      top: 12px;
      right: 12px;
    }
  }

  .toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 30, 30, 0.88);
    color: white;
    padding: 10px 20px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    z-index: 3000;
    pointer-events: none;
    backdrop-filter: blur(10px);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.7);
    border-radius: 20px;
    padding: 24px;
    width: 90%;
    max-width: 360px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  }

  .modal h3 {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 700;
  }

  .modal p {
    margin: 0 0 14px;
    font-size: 14px;
    color: #555;
  }

  .modal textarea {
    width: 100%;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    resize: none;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    background: rgba(255,255,255,0.6);
  }

  .modal-buttons {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: flex-end;
  }

  .modal-cancel {
    padding: 8px 18px;
    border-radius: 50px;
    border: 1px solid rgba(0,0,0,0.12);
    background: transparent;
    font-size: 14px;
    cursor: pointer;
  }

  .modal-submit {
    padding: 8px 18px;
    border-radius: 50px;
    border: none;
    background: #f44336;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .modal-submit:disabled {
    background: #ccc;
    cursor: default;
  }

  .report-thanks {
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: #2e7d32;
    padding: 8px 0;
  }
</style>
