import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./Login.css";

function Icon({ name, className = "" }) {
  return (
    <span className={`auth-login-icon ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("campusfix_token", data.access_token);
      localStorage.setItem("campusfix_user", JSON.stringify(data.user));

      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-login-shell">
      {/* ---------- Brand panel (desktop / tablet) ---------- */}
      <aside className="auth-login-hero">
        <div className="auth-login-hero-inner">
          <div className="auth-login-brand">
            <span className="auth-login-brand-mark">
              <Icon name="domain" />
            </span>
            <span className="auth-login-brand-name">CampusFix</span>
            <span className="auth-login-brand-tag">Smart Ops</span>
          </div>

          <div className="auth-login-hero-copy">
            <h2>AI-Powered Smart Campus Issue Management.</h2>
            <p>
              Report facility issues, track live repairs, and keep your campus
              running smoothly.
            </p>
          </div>
        </div>

        <ul className="auth-login-features">
          <li>
            <span className="auth-login-feature-icon">
              <Icon name="add_circle" />
            </span>
            <div>
              <strong>Report in minutes</strong>
              <span>Describe the problem and attach a photo.</span>
            </div>
          </li>
          <li>
            <span className="auth-login-feature-icon">
              <Icon name="auto_awesome" />
            </span>
            <div>
              <strong>AI-assisted triage</strong>
              <span>Issues are categorised and prioritised automatically.</span>
            </div>
          </li>
          <li>
            <span className="auth-login-feature-icon">
              <Icon name="timeline" />
            </span>
            <div>
              <strong>Track every update</strong>
              <span>Follow the status of each issue from report to resolution.</span>
            </div>
          </li>
        </ul>
      </aside>

      {/* ---------- Sign-in card ---------- */}
      <main className="auth-login-main">
        <div className="auth-login-card">
          <div className="auth-login-mobile-brand">
            <span className="auth-login-brand-mark">
              <Icon name="domain" />
            </span>
            <span className="auth-login-brand-name">CampusFix</span>
          </div>

          <div className="auth-login-heading">
            <p className="auth-login-eyebrow">SMART CAMPUS MANAGEMENT</p>
            <h1>Welcome back</h1>
            <p>Sign in to manage your campus issues.</p>
          </div>

          <form className="auth-login-form" onSubmit={handleLogin}>
            <div className="auth-login-field">
              <label htmlFor="auth-login-email">Email address</label>
              <div className="auth-login-input-wrap">
                <Icon name="mail" className="auth-login-input-icon" />
                <input
                  id="auth-login-email"
                  className="auth-login-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-login-field">
              <label htmlFor="auth-login-password">Password</label>
              <div className="auth-login-input-wrap">
                <Icon name="lock" className="auth-login-input-icon" />
                <input
                  id="auth-login-password"
                  className="auth-login-input has-toggle"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-login-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} />
                </button>
              </div>
            </div>

            {error && (
              <p className="auth-login-error" role="alert">
                <Icon name="error" className="auth-login-icon-sm" />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" className="auth-login-submit" disabled={loading}>
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              {!loading && <Icon name="arrow_forward" className="auth-login-icon-sm" />}
            </button>
          </form>

          <p className="auth-login-footer">
            Don't have an account? <Link to="/register">Create account</Link>
          </p>
        </div>

        <p className="auth-login-copy">
          © {new Date().getFullYear()} CampusFix • Smart Campus Operations
        </p>
      </main>
    </div>
  );
}

export default Login;
