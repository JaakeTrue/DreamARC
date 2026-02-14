import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";

// --- STYLES ---
const loginStyles = `
  body, html { margin: 0; padding: 0; font-family: Inter, sans-serif; background-color: #1a1a1a; color: #eaeaea; }
  .login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; width: 100vw; flex-direction: column; gap: 1rem; padding: 1rem; box-sizing: border-box; }
  .login-card { background-color: #202020; border-radius: 1rem; backdrop-filter: blur(10px); width: 100%; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
  .login-content { display: flex; justify-content: center; align-items: center; flex-direction: column; gap: 1rem; padding: 3rem 1rem; }
  .login-title { font-size: 2.25rem; color: white; font-weight: 700; text-transform: uppercase; margin: 0; }
  .login-subtitle { font-size: 0.875rem; margin-bottom: 1.5rem; color: #a0a0a0; text-align: center; }
  .input-group { width: 85%; margin-bottom: 1rem; }
  .input-label { color: white; font-size: 0.875rem; margin-bottom: 0.5rem; display: block; }
  .login-input { width: 100%; background-color: #2d2d2d; padding: 1rem 1.25rem; border-radius: 0.375rem; color: white; outline: none; border: 1px solid #272727; box-sizing: border-box; }
  .login-input::placeholder { color: #555; }
  .password-wrapper { position: relative; }
  .password-toggle { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); cursor: pointer; background: none; border: none; color: #868686; font-size: 1.25rem; padding: 0.5rem; }
  .button-container { display: flex; justify-content: center; align-items: center; margin-top: 0.5rem; }
  .login-button { padding: 1rem 2rem; border-radius: 9999px; background-color: #7e22ce; color: white; font-weight: 600; text-transform: uppercase; cursor: pointer; border: none; transition: background-color 0.3s ease; }
  .login-button:hover:not(:disabled) { background-color: #a855f7; }
  .login-button:disabled { background-color: #3e3e3e; cursor: not-allowed; opacity: 0.7; }
  .links-container { margin-top: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .demo-button, .toggle-mode-button { background: none; border: 1px solid #7e22ce; color: #a855f7; padding: 0.5rem 1rem; border-radius: 9999px; cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: all 0.3s ease; width: fit-content; }
  .demo-button:hover:not(:disabled), .toggle-mode-button:hover { background: #7e22ce; color: white; }
  .demo-button:disabled { border-color: #3e3e3e; color: #3e3e3e; cursor: not-allowed; opacity: 0.7;}
  .back-link { font-size: 0.75rem; text-transform: uppercase; color: #a0a0a0; text-decoration: none; transition: color 0.3s ease; }
  .back-link:hover { color: white; }
  .error-message { color: #f87171; font-size: 0.875rem; margin-top: 0.5rem; text-align: center; height: 1.2em; }
`;

export default function Welcome() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [grade, setGrade] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { login, register, authLoading } = useAuth();
  const navigate = useNavigate();

  // --- Login Handler (FIXED) ---
  const handleLogin = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    try {
      const user = await login(username.trim(), password);
      
      console.log("Login Success. User object received:", user);
      
      if (user && user.id) {
          console.log(`Navigating to student dashboard with ID: ${user.id}`);
          
          // ✅ FIX: Go to /student/:id instead of /dashboard
          navigate(`/student/${user.id}`, { replace: true }); 
      } else {
          console.error("Login failed to provide a valid student ID for navigation.", user);
          setError("Login succeeded, but the dashboard link is missing (Student ID not returned).");
      }
      
    } catch (err) {
      setError(err?.message || "Login failed.");
      console.error("Login component caught error:", err);
    }
  };

  // --- Sign Up Handler ---
  const handleSignUp = async () => {
      setError("");
      if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
        setError("Username, password, and confirmation are required.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters long.");
        return;
      }
      try {
        await register(username.trim(), password, grade.trim() || null);
        setIsLoginMode(true);
        setError("");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setGrade("");
        toast.success("Account created! Please log in.");
      } catch (err) {
        setError(err?.message || "Sign up failed.");
        console.error("Sign up component caught error:", err);
      }
  };

// --- Demo Login Handler (FIXED) ---
  const handleDemoLogin = async () => {
    setError("");
    try {
      const user = await login("STUDENT01", "student01");
      
      console.log("Demo Login Success. User object received:", user);

      if (user && user.id) {
          console.log(`Navigating to student dashboard with ID: ${user.id}`);
          
          // ✅ FIX: Go to /student/:id instead of /dashboard
          navigate(`/student/${user.id}`, { replace: true });
      } else {
          console.error("Demo login failed to provide a valid student ID for navigation.", user);
          setError("Demo login succeeded, but the dashboard link is missing (Student ID not returned).");
      }

    } catch (err) {
      setError(err?.message || "Demo login failed.");
      console.error("Demo login component caught error:", err);
    }
  };

  // --- Form Submission ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (authLoading) return;

    if (isLoginMode) {
      handleLogin();
    } else {
      handleSignUp();
    }
  };

  // --- Enter Key Handler ---
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  }

  // --- Toggle Login/Sign Up Mode ---
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setGrade("");
  };

  return (
    <>
      <style>{loginStyles}</style>
      <div className="login-container">
        <div className="login-card">
          <form className="login-content" onSubmit={handleSubmit}>
            <h1 className="login-title">Mentor-Tutors</h1>
            <p className="login-subtitle">
              {isLoginMode ? "Game Changer: Welcome to the future of tutoring!" : "Create your Account"}
            </p>

            <div className="input-group">
              <label className="input-label" htmlFor="username-input">Username:</label>
              <input
                id="username-input"
                type="text"
                className="login-input"
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                value={username}
                placeholder={isLoginMode ? "STUDENT01" : "Choose a username"}
                autoComplete="username"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password-input">Password:</label>
              <div className="password-wrapper">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  value={password}
                  placeholder={isLoginMode ? "student01" : "Create password (min 4 chars)"}
                  autoComplete={isLoginMode ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {!isLoginMode && (
              <>
                <div className="input-group">
                  <label className="input-label" htmlFor="confirm-password-input">Confirm Password:</label>
                  <input
                    id="confirm-password-input"
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    value={confirmPassword}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="grade-input">Grade (Optional):</label>
                  <input
                    id="grade-input"
                    type="text"
                    className="login-input"
                    onChange={(e) => setGrade(e.target.value)}
                    onKeyDown={handleKeyDown}
                    value={grade}
                    placeholder="e.g., 4th Grade"
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            <p className="error-message">{error || ""}</p>

            <div className="button-container">
              <button type="submit" className="login-button" disabled={authLoading}>
                {authLoading ? "..." : (isLoginMode ? "Login" : "Sign Up")}
              </button>
            </div>
          </form>
        </div>

        <div className="links-container">
          {isLoginMode && (
              <button
                type="button"
                className="demo-button"
                onClick={handleDemoLogin}
                disabled={authLoading}
              >
                {authLoading ? "..." : "Demo Login (STUDENT01)"}
              </button>
          )}

          <button
            type="button"
            className="toggle-mode-button"
            onClick={toggleMode}
            disabled={authLoading}
          >
            {isLoginMode ? "Need an account? Sign Up" : "Already have an account? Login"}
          </button>

          <Link to="/" className="back-link">
            Back to Website
          </Link>
        </div>
      </div>
    </>
  );
}