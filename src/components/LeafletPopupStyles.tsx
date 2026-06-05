export function LeafletPopupStyles() {
  return (
    <style>{`
      .leaflet-popup-content-wrapper {
        border-radius: 12px;
      }
      .leaflet-popup-content {
        margin: 12px 16px;
      }
      @media (max-width: 640px) {
        .leaflet-popup {
          max-width: calc(100vw - 16px);
        }
        .leaflet-popup-content-wrapper {
          max-width: calc(100vw - 32px) !important;
        }
        .leaflet-popup-content {
          width: min(340px, calc(100vw - 56px)) !important;
          max-width: calc(100vw - 56px) !important;
          max-height: min(420px, calc(100dvh - 180px));
          overflow-y: auto;
          margin: 10px 12px;
        }
      }
    `}</style>
  );
}
