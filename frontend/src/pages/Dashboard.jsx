
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./Dashboard.css";

// Correctly handles UTC timestamps and timestamps with timezone offsets.
function formatDateTime(value, options) {
  if (!value) return "";

  const text = String(value);
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(text);
  const date = new Date(hasTimezone ? text : `${text}Z`);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", options);
}

function statusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

function Icon({ name, className = "" }) {
  return (
    <span className={`student-icon ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationFilter, setNotificationFilter] = useState("all");

  // Load notifications from the backend
  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiRequest("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      setNotificationError("");
    } catch (err) {
      setNotificationError(err.message);
    }
  }, []);

  // Load dashboard data
  useEffect(() => {
    async function loadDashboard() {
      try {
        const [profile, myIssues] = await Promise.all([
          apiRequest("/me"),
          apiRequest("/issues/my"),
        ]);

        setUser(profile);
        setIssues(myIssues);

        // Load student notifications
        const notificationData = await apiRequest("/notifications");
        setNotifications(notificationData.notifications || []);
        setUnreadCount(notificationData.unread_count || 0);
      } catch (err) {
        setError(err.message);

        if (
          err.message.toLowerCase().includes("token") ||
          err.message.toLowerCase().includes("credentials")
        ) {
          localStorage.removeItem("campusfix_token");
          localStorage.removeItem("campusfix_user");
          navigate("/login");
        }
      }
    }

    loadDashboard();
  }, [navigate]);

  // Automatically refresh notifications every 10 seconds
  useEffect(() => {
    const interval = setInterval(loadNotifications, 10000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Logout
  function logout() {
    localStorage.removeItem("campusfix_token");
    localStorage.removeItem("campusfix_user");
    navigate("/login");
  }

  // Mark one notification as read
  async function markAsRead(notificationId) {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (err) {
      setNotificationError(err.message);
    }
  }

  // Mark all notifications as read
  async function markAllAsRead() {
    try {
      const unreadNotifications = notifications.filter(
        (notification) => !notification.is_read
      );

      await Promise.all(
        unreadNotifications.map((notification) =>
          apiRequest(`/notifications/${notification.id}/read`, {
            method: "PATCH",
          })
        )
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setUnreadCount(0);
      setNotificationError("");
    } catch (err) {
      setNotificationError(err.message);
      await loadNotifications();
    }
  }

  // Toggle notification dropdown
  function toggleNotifications() {
    const opening = !showNotifications;
    setShowNotifications(opening);

    if (opening) {
      loadNotifications();
    }
  }

  function closeNotifications() {
    setShowNotifications(false);
  }

  // ---------- Statistics from real backend data ----------

  const pending = issues.filter((i) => i.status === "Pending").length;
  const progress = issues.filter((i) => i.status === "In Progress").length;
  const resolved = issues.filter((i) => i.status === "Resolved").length;

  const resolutionRate = issues.length
    ? Math.round((resolved / issues.length) * 100)
    : 0;

  const recentIssues = issues.slice(0, 5);

  const visibleNotifications =
    notificationFilter === "unread"
      ? notifications.filter((notification) => !notification.is_read)
      : notifications;

  const displayName = user?.name || "Student";
  const unreadLabel = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className="student-shell">
      {/* ---------- Sidebar ---------- */}
      <aside className="student-sidebar">
        <div className="student-sidebar-top">
          <div className="student-brand">
            <span className="student-brand-mark">
              <Icon name="home_repair_service" />
            </span>

            <span className="student-brand-name">
              CampusFix
              <span className="student-brand-tag">Student</span>
            </span>
          </div>

          <nav className="student-nav" aria-label="Main navigation">
            <Link
              className="student-nav-link is-active"
              to="/dashboard"
              aria-current="page"
              title="Dashboard"
            >
              <Icon name="grid_view" />
              <span className="student-nav-text">Dashboard</span>
            </Link>

            <Link
              className="student-nav-link"
              to="/report"
              title="Report Issue"
            >
              <Icon name="add_circle" />
              <span className="student-nav-text">Report Issue</span>
            </Link>

            <Link
              className="student-nav-link"
              to="/my-issues"
              title="My Issues"
            >
              <Icon name="assignment" />
              <span className="student-nav-text">My Issues</span>
            </Link>
          </nav>
        </div>

        <div className="student-sidebar-bottom">
          <button
            type="button"
            className="student-logout"
            onClick={logout}
            title="Logout"
          >
            <Icon name="logout" />
            <span className="student-nav-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="student-main">
        <header className="student-header">
          <div className="student-crumbs">
            <span className="student-crumb-muted">
              <Icon name="school" className="student-icon-sm" />
              Student Portal
            </span>

            <span className="student-crumb-sep">/</span>
            <h1 className="student-crumb-title">Dashboard</h1>
          </div>

          <div className="student-header-right">
            {/* Notification bell + dropdown */}
            <div
              className="student-notify"
              onKeyDown={(e) => {
                if (e.key === "Escape") closeNotifications();
              }}
            >
              <button
                type="button"
                className="student-bell"
                onClick={toggleNotifications}
                title="Notifications"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                aria-haspopup="dialog"
                aria-expanded={showNotifications}
              >
                <Icon name="notifications" />

                {unreadCount > 0 && (
                  <span className="student-bell-badge">
                    {unreadLabel}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <button
                    type="button"
                    className="student-backdrop"
                    aria-label="Close notifications"
                    tabIndex={-1}
                    onClick={closeNotifications}
                  />

                  <section
                    className="student-popover"
                    role="dialog"
                    aria-label="Notifications"
                  >
                    <div className="student-popover-head">
                      <div className="student-popover-title">
                        <strong>Notifications</strong>

                        <span
                          className={`student-count-pill ${
                            unreadCount === 0 ? "is-zero" : ""
                          }`}
                        >
                          {unreadCount} unread
                        </span>
                      </div>

                      <div className="student-popover-actions">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            className="student-link-btn"
                            onClick={markAllAsRead}
                          >
                            Mark all as read
                          </button>
                        )}

                        <button
                          type="button"
                          className="student-icon-btn"
                          onClick={closeNotifications}
                          aria-label="Close notifications"
                        >
                          <Icon
                            name="close"
                            className="student-icon-sm"
                          />
                        </button>
                      </div>
                    </div>

                    <div className="student-tabs">
                      <button
                        type="button"
                        className={`student-tab ${
                          notificationFilter === "all" ? "is-active" : ""
                        }`}
                        aria-pressed={notificationFilter === "all"}
                        onClick={() => setNotificationFilter("all")}
                      >
                        All ({notifications.length})
                      </button>

                      <button
                        type="button"
                        className={`student-tab ${
                          notificationFilter === "unread" ? "is-active" : ""
                        }`}
                        aria-pressed={notificationFilter === "unread"}
                        onClick={() => setNotificationFilter("unread")}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>

                    <div className="student-popover-list">
                      {notificationError && (
                        <p className="student-popover-error" role="alert">
                          {notificationError}
                        </p>
                      )}

                      {notifications.length === 0 ? (
                        <p className="student-popover-empty">
                          No notifications yet.
                        </p>
                      ) : visibleNotifications.length === 0 ? (
                        <div className="student-popover-empty">
                          <Icon
                            name="done_all"
                            className="student-icon-lg"
                          />
                          <strong>All caught up</strong>
                          <span>No unread notifications at this time.</span>
                        </div>
                      ) : (
                        visibleNotifications.map((notification) => (
                          <article
                            key={notification.id}
                            className={`student-note ${
                              notification.is_read ? "is-read" : "is-unread"
                            }`}
                          >
                            <span className="student-note-icon">
                              <Icon
                                name={
                                  notification.is_read
                                    ? "check_circle"
                                    : "notifications_active"
                                }
                                className="student-icon-md"
                              />
                            </span>

                            <div className="student-note-body">
                              <div className="student-note-top">
                                <strong>{notification.title}</strong>

                                {!notification.is_read && (
                                  <span
                                    className="student-unread-dot"
                                    aria-label="Unread"
                                  />
                                )}
                              </div>

                              <p>{notification.message}</p>

                              <div className="student-note-foot">
                                <small>
                                  {formatDateTime(notification.created_at)}
                                </small>

                                {notification.is_read ? (
                                  <small className="student-read-label">
                                    Read ✓
                                  </small>
                                ) : (
                                  <button
                                    type="button"
                                    className="student-link-btn"
                                    onClick={() =>
                                      markAsRead(notification.id)
                                    }
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>

            <span className="student-divider" aria-hidden="true" />

            {/* Student profile */}
            <div className="student-profile">
              <div className="student-profile-text">
                <strong>{displayName}</strong>
                <small>Student</small>
              </div>

              <div className="student-avatar" aria-hidden="true">
                {user?.name?.charAt(0).toUpperCase() || "S"}
              </div>
            </div>
          </div>
        </header>

        <main className="student-content">
          {error && (
            <p className="student-error" role="alert">
              {error}
            </p>
          )}

          {/* Welcome */}
          <section className="student-card student-welcome">
            <div>
              <p className="student-eyebrow">CAMPUSFIX OVERVIEW</p>
              <h2>Hello, {displayName} 👋</h2>

              <p className="student-welcome-text">
                Report campus problems and track their progress in one place.
              </p>
            </div>

            <Link className="student-primary-btn" to="/report">
              <Icon name="add_circle" />
              <span>Report an Issue</span>
            </Link>
          </section>

          {/* Stats */}
          <section
            className="student-stats"
            aria-label="Issue statistics"
          >
            <div className="student-card student-stat">
              <div className="student-stat-top">
                <div>
                  <span className="student-stat-label">Total Issues</span>
                  <span className="student-stat-hint">
                    Your submitted complaints
                  </span>
                </div>

                <span className="student-stat-icon is-total">
                  <Icon name="confirmation_number" />
                </span>
              </div>

              <strong className="student-stat-value">
                {issues.length}
              </strong>
            </div>

            <div className="student-card student-stat">
              <div className="student-stat-top">
                <div>
                  <span className="student-stat-label">Pending</span>
                  <span className="student-stat-hint">
                    Awaiting action
                  </span>
                </div>

                <span className="student-stat-icon is-pending">
                  <Icon name="hourglass_top" />
                </span>
              </div>

              <strong className="student-stat-value">{pending}</strong>
            </div>

            <div className="student-card student-stat">
              <div className="student-stat-top">
                <div>
                  <span className="student-stat-label">In Progress</span>
                  <span className="student-stat-hint">
                    Currently being handled
                  </span>
                </div>

                <span className="student-stat-icon is-in-progress">
                  <Icon name="build" />
                </span>
              </div>

              <strong className="student-stat-value">{progress}</strong>
            </div>

            <div className="student-card student-stat">
              <div className="student-stat-top">
                <div>
                  <span className="student-stat-label">Resolved</span>
                  <span className="student-stat-hint">
                    Successfully completed
                  </span>
                </div>

                <span className="student-stat-icon is-resolved">
                  <Icon name="task_alt" />
                </span>
              </div>

              <div className="student-stat-bottom">
                <strong className="student-stat-value">{resolved}</strong>

                {issues.length > 0 && (
                  <span className="student-rate-pill">
                    {resolutionRate}% resolution rate
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Recent issues */}
          <section className="student-card student-recent">
            <div className="student-recent-head">
              <div>
                <h2>Recent Issues</h2>
                <p>Your latest reported campus issues</p>
              </div>

              <Link className="student-view-all" to="/my-issues">
                View all{" "}
                <Icon
                  name="arrow_forward"
                  className="student-icon-md"
                />
              </Link>
            </div>

            {issues.length === 0 ? (
              <div className="student-empty">
                <h3>No issues reported yet</h3>
                <p>Your submitted complaints will appear here.</p>
                <Link to="/report">Report your first issue</Link>
              </div>
            ) : (
              <>
                <div className="student-table-wrap">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th scope="col">Issue / Title</th>
                        <th scope="col">Category</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="student-th-action">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentIssues.map((issue) => {
                        const reported = formatDateTime(issue.created_at, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        });

                        return (
                          <tr key={issue.id}>
                            <td
                              className="student-cell-title"
                              data-label="Issue"
                            >
                              <strong>{issue.title}</strong>
                              <small>
                                Issue #{issue.id}
                                {reported ? ` · ${reported}` : ""}
                              </small>
                            </td>

                            <td data-label="Category">
                              <span className="student-chip">
                                {issue.category || "Other"}
                              </span>
                            </td>

                            <td data-label="Status">
                              <span
                                className={`student-status is-${statusClass(
                                  issue.status
                                )}`}
                              >
                                <span className="student-status-dot" />
                                {issue.status}
                              </span>
                            </td>

                            <td
                              className="student-cell-action"
                              data-label="Action"
                            >
                              <Link to="/my-issues">View →</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="student-recent-foot">
                  Showing {recentIssues.length} of {issues.length} total
                  recorded issues
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
