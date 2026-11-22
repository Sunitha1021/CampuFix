import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./Register.css";

function Icon({ name, className = "" }) {
  return (
    <span className={`auth-register-icon ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const passwordLongEnough = password.length >= 8;

  return (
    <div className="auth-register-shell">
      {/* ---------- Brand panel (desktop / tablet) ---------- */}
      <aside className="auth-register-hero">
        <div className="auth-register-hero-inner">
          <div className="auth-register-brand">
            <span className="auth-register-brand-mark">
              <Icon name="handyman" />
            </span>
            <span className="auth-register-brand-name">CampusFix</span>
          </div>

          <div className="auth-register-hero-copy">
            <p className="auth-register-hero-eyebrow">SMART CAMPUS OPERATIONS</p>
            <h2>Join your campus community.</h2>
            <p>
              AI-Powered Smart Campus Issue Management. Report facility issues,
              track live repairs, and keep your campus running smoothly.
            </p>
          </div>
        </div>

        <ul className="auth-register-features">
          <li>
            <span className="auth-register-feature-icon">
              <Icon name="add_circle" />
            </span>
            <div>
              <strong>Report in minutes</strong>
              <span>Describe the problem and attach a photo.</span>
            </div>
          </li>
          <li>
            <span className="auth-register-feature-icon">
              <Icon name="auto_awesome" />
            </span>
            <div>
              <strong>AI-assisted triage</strong>
              <span>Issues are categorised and prioritised automatically.</span>
            </div>
          </li>
          <li>
            <span className="auth-register-feature-icon">
              <Icon name="timeline" />
            </span>
            <div>
              <strong>Track every update</strong>
              <span>Follow the status of each issue from report to resolution.</span>
            </div>
          </li>
        </ul>
      </aside>

      {/* ---------- Registration card ---------- */}
      <main className="auth-register-main">
        <div className="auth-register-card">
          <div className="auth-register-mobile-brand">
            <span className="auth-register-brand-mark">
              <Icon name="handyman" />
            </span>
            <span className="auth-register-brand-name">CampusFix</span>
          </div>

          <div className="auth-register-heading">
            <p className="auth-register-eyebrow">JOIN YOUR CAMPUS COMMUNITY</p>
            <h1>Create account</h1>
            <p>Register to report and track campus issues.</p>
          </div>

          <form className="auth-register-form" onSubmit={handleRegister}>
            <div className="auth-register-field">
              <label htmlFor="auth-register-name">Full name</label>
              <div className="auth-register-input-wrap">
                <Icon name="person" className="auth-register-input-icon" />
                <input
                  id="auth-register-name"
                  className="auth-register-input"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            <div className="auth-register-field">
              <label htmlFor="auth-register-email">Email address</label>
              <div className="auth-register-input-wrap">
                <Icon name="mail" className="auth-register-input-icon" />
                <input
                  id="auth-register-email"
                  className="auth-register-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="auth-register-field">
              <label htmlFor="auth-register-password">Password</label>
              <div className="auth-register-input-wrap">
                <Icon name="lock" className="auth-register-input-icon" />
                <input
                  id="auth-register-password"
                  className="auth-register-input has-toggle"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                  aria-describedby="auth-register-password-hint"
                />
                <button
                  type="button"
                  className="auth-register-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} />
                </button>
              </div>

              <p
                id="auth-register-password-hint"
                className={`auth-register-hint ${passwordLongEnough ? "is-ok" : ""}`}
              >
                <Icon
                  name={passwordLongEnough ? "check_circle" : "info"}
                  className="auth-register-icon-xs"
                />
                At least 8 characters ({password.length}/8)
              </p>
            </div>

            {error && (
              <p className="auth-register-error" role="alert">
                <Icon name="error" className="auth-register-icon-sm" />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" className="auth-register-submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-register-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>

        <p className="auth-register-copy">
          © {new Date().getFullYear()} CampusFix • Smart Campus Operations
        </p>
      </main>
    </div>
  );
}

export default Register;
