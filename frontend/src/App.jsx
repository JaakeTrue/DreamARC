import { Routes, Route, Navigate } from "react-router-dom";
import Welcome from "./components/Welcome";
import GameChanger from "./components/GameChanger";
import PageStudent from "./pages/PageStudent";
import AdminPanel from "./pages/AdminPanel";
import InstructorView from "./pages/InstructorView";
import PageTeacherBoard from "./pages/PageTeacherBoard";

export default function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public entry (Welcome contains login) */}
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />

        {/* Student dashboard */}
        <Route path="/student/:studentId" element={<PageStudent />} />
        <Route path="/student/:studentId/:pqKey" element={<PageStudent />} />

        {/* Game Changer */}
        <Route path="/gamechanger/:studentId" element={<GameChanger />} />

        {/* Instructor & Admin */}
        <Route path="/instructor" element={<InstructorView />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/teacher" element={<PageTeacherBoard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </div>
  );
}