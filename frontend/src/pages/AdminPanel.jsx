import React from "react";
import { Link } from "react-router-dom";

export default function AdminPanel() {
  return (
    <div style={{ padding: 24, color: "white", background: "black", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Admin Panel</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>
        Placeholder page to unblock Cloudflare Pages build.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/" style={{ color: "#60a5fa" }}>← Back to Home</Link>
      </div>
    </div>
  );
}
