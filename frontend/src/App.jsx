import React from "react";
import MapView from "./components/MapView";

export default function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <h1 style={{ textAlign: "center", margin: "10px 0" }}>MapifyIt — Islamabad Map</h1>
      <MapView />
    </div>
  );
}
