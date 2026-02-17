import React from "react";
import { Link } from "react-router-dom";

export default function InstructorView() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Instructor View</h1>
      <p>This module is under construction.</p>
      <div style={{ marginTop: 12 }}>
        <Link to="/" style={{ marginRight: 12 }}>Home</Link>
        <Link to="/dashboard">Dashboard</Link>
      </div>
    </div>
  );
}
