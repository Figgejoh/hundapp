function Legend() {
  return (
    <div
      style={{
        position: "aboslute",
        bottom: "20px",
        left: "20px",
        padding: "8px 8px",
        borderRadius: "8px",
        boxShadow: "0, 2px 6px rgba(0, 0, 0, 0.3)",
        fontSize: "14px",
        lineHeight: "1.6",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          alt="Blå"
          width="18"
          height="18"
        />
        <span>Officiell hundbadplats</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src="https://maps.google.com/mapfiles/ms/icons/green-dot.png"
          alt="Grön"
          width="18"
          height="18"
        />
        <span>Tillåten hundbadplats</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
          alt="Röd"
          width="18"
          height="18"
        />
        <span>Ej tillåten för hund</span>
      </div>
    </div>
  );
}

export default Legend;
