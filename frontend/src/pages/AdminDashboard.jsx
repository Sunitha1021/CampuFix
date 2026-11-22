import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./AdminDashboard.css";

const API_BASE_URL = "http://127.0.0.1:8000";

// Colours for the (dynamic) category bars. Categories come from the API,
// so the palette simply cycles.
const CATEGORY_COLORS = [
  "#3b82f6",
  "#38bdf8",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#f472b6",
  "#94a3b8"
];

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "In Progress": "#38bdf8",
  Resolved: "#34d399"
};

const STATUS_ICONS = {
  Pending: "schedule",
  "In Progress": "sync",
  Resolved: "check_circle"
};

const PRIORITY_HINTS = {
  High: "Needs quick action",
  Medium: "Scheduled queue",
  Low: "Routine batch"
};

// Same date handling as the previous dashboard: the backend sends UTC
// timestamps without a "Z", so one is appended before parsing.
function parseServerDate(value) {
  if (!value) return null;
  const text = String(value);
  const date = new Date(text.endsWith("Z") ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options) {
  const date = parseServerDate(value);
  return date ? date.toLocaleString("en-IN", options) : "Date unavailable";
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "-");
}

function getInitials(name) {
  if (!name) return "AD";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}

function percent(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

function KpiCard({ label, value, hint, icon, tone }) {
  return (
    <div className={`cfa-card cfa-kpi cfa-tone-${tone}`}>
      <div className="cfa-kpi-top">
        <span className="cfa-kpi-label">{label}</span>
        <span className="cfa-kpi-icon">
          <span className="material-symbols-outlined cfa-icon-md">{icon}</span>
        </span>
      </div>
      <div>
        <div className="cfa-kpi-value">{value}</div>
        <div className="cfa-kpi-hint">{hint}</div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [issues, setIssues] = useState([]);
  const [histories, setHistories] = useState({});
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [activeNav, setActiveNav] = useState("overview");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [userData, issueData] = await Promise.all([
        apiRequest("/me"),
        apiRequest("/issues")
      ]);

      if (userData.role !== "admin") {
        localStorage.removeItem("campusfix_token");
        localStorage.removeItem("campusfix_user");
        navigate("/login");
        return;
      }

      setAdmin(userData);
      setIssues(issueData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function toggleHistory(issueId) {
    if (expandedIssue === issueId) {
      setExpandedIssue(null);
      return;
    }

    setExpandedIssue(issueId);

    // Avoid fetching history repeatedly
    if (histories[issueId]) return;

    try {
      const data = await apiRequest(`/issues/${issueId}/history`);

      setHistories(prev => ({
        ...prev,
        [issueId]: data
      }));
    } catch (err) {
      setError("Unable to load issue history.");
    }
  }

  async function updateStatus(issueId, newStatus) {
    try {
      setUpdatingId(issueId);
      setError("");

      await apiRequest(`/issues/${issueId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });

      // Refresh the status history
      const updatedHistory = await apiRequest(`/issues/${issueId}/history`);

      setHistories(prev => ({
        ...prev,
        [issueId]: updatedHistory
      }));

      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function logout() {
    localStorage.removeItem("campusfix_token");
    localStorage.removeItem("campusfix_user");
    navigate("/login");
  }

  // ---------- KPI + analytics, all derived from the fetched issues ----------

  const total = issues.length;
  const pending = issues.filter(i => i.status === "Pending").length;
  const inProgress = issues.filter(i => i.status === "In Progress").length;
  const resolved = issues.filter(i => i.status === "Resolved").length;
  const completionRate = percent(resolved, total);

  const todayString = new Date().toDateString();
  const reportedToday = issues.filter(issue => {
    const date = parseServerDate(issue.created_at);
    return date && date.toDateString() === todayString;
  }).length;

  // Category-wise issue statistics (largest first)
  const categoryStats = Object.entries(
    issues.reduce((counts, issue) => {
      const category = issue.category || "Other";
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  // Priority statistics
  const priorityStats = ["High", "Medium", "Low"].map(priority => ({
    name: priority,
    count: issues.filter(issue => issue.priority === priority).length
  }));

  // Status statistics
  const statusStats = [
    { name: "Pending", count: pending },
    { name: "In Progress", count: inProgress },
    { name: "Resolved", count: resolved }
  ];

  const highPriorityCount = priorityStats[0].count;

  // ---------- Filter and sort issues ----------

  const filteredIssues = issues
    .filter(issue => {
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        issue.title?.toLowerCase().includes(search) ||
        issue.description?.toLowerCase().includes(search) ||
        issue.student_name?.toLowerCase().includes(search) ||
        issue.student_email?.toLowerCase().includes(search) ||
        String(issue.id).includes(search);

      const matchesStatus =
        statusFilter === "All" || issue.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" || issue.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => (sortOrder === "newest" ? b.id - a.id : a.id - b.id));

  const categories = [
    ...new Set(issues.map(issue => issue.category).filter(Boolean))
  ];

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  if (loading && !admin) {
    return <div className="cfa-loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="cfa-shell">
      {/* ---------- Sidebar ---------- */}
      <aside className="cfa-sidebar">
        <div className="cfa-brand">
          <span className="cfa-logo">
            <span className="material-symbols-outlined">build_circle</span>
          </span>
          <div className="cfa-brand-text">
            <span className="cfa-brand-name">
              CampusFix
              <span className="cfa-badge-admin">Admin</span>
            </span>
            <span className="cfa-brand-sub">Campus Operations</span>
          </div>
        </div>

        <nav className="cfa-nav">
          <a
            href="#overview"
            title="Overview"
            className={`cfa-nav-link ${activeNav === "overview" ? "is-active" : ""}`}
            onClick={() => setActiveNav("overview")}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="cfa-nav-text">Overview</span>
          </a>

          <a
            href="#issues"
            title="Manage Issues"
            className={`cfa-nav-link ${activeNav === "issues" ? "is-active" : ""}`}
            onClick={() => setActiveNav("issues")}
          >
            <span className="material-symbols-outlined">assignment</span>
            <span className="cfa-nav-text">Manage Issues</span>
            <span className="cfa-nav-count">{total}</span>
          </a>

          <a
            href="#analytics"
            title="Analytics"
            className={`cfa-nav-link ${activeNav === "analytics" ? "is-active" : ""}`}
            onClick={() => setActiveNav("analytics")}
          >
            <span className="material-symbols-outlined">insights</span>
            <span className="cfa-nav-text">Analytics</span>
          </a>
        </nav>

        <div className="cfa-sidebar-foot">
          <div className="cfa-user-chip">
            <div className="cfa-avatar">{getInitials(admin?.name)}</div>
            <div className="cfa-user-meta">
              <strong>{admin?.name || "Administrator"}</strong>
              <small>{admin?.email || "Admin account"}</small>
            </div>
            <button
              type="button"
              className="cfa-logout"
              title="Log Out"
              aria-label="Log out"
              onClick={logout}
            >
              <span className="material-symbols-outlined cfa-icon-md">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="cfa-main-wrap">
        <header className="cfa-header">
          <div className="cfa-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Search by ID, student, title or description..."
              aria-label="Search issues"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="cfa-header-right">
            <div className="cfa-date-chip">
              <span className="material-symbols-outlined cfa-icon-sm">calendar_today</span>
              <span>Today: {todayLabel}</span>
            </div>

            <div className="cfa-profile">
              <span className="cfa-profile-icon">
                <span className="material-symbols-outlined cfa-icon-md">shield_person</span>
              </span>
              <div className="cfa-profile-meta">
                <strong>{admin?.name || "Administrator"}</strong>
                <small>Administrator</small>
              </div>
            </div>
          </div>
        </header>

        <main className="cfa-content">
          <div className="cfa-page-title cfa-anchor">
            <h1>Overview Dashboard</h1>
            <p>Facility ticket management and student issue resolution across campus.</p>
          </div>

          {error && <div className="cfa-error">{error}</div>}

          {/* KPI cards */}
          <section id="overview" className="cfa-kpis cfa-anchor">
            <KpiCard
              label="Total Issues"
              value={total}
              icon="confirmation_number"
              tone="blue"
              hint={`${reportedToday} reported today`}
            />
            <KpiCard
              label="Pending Issues"
              value={pending}
              icon="pending_actions"
              tone="amber"
              hint="Awaiting action"
            />
            <KpiCard
              label="In Progress"
              value={inProgress}
              icon="sync_saved_locally"
              tone="sky"
              hint="Currently being handled"
            />
            <KpiCard
              label="Resolved"
              value={resolved}
              icon="check_circle"
              tone="green"
              hint={`${completionRate}% completion rate`}
            />
          </section>

          {/* Analytics */}
          <section id="analytics" className="cfa-analytics cfa-anchor">
            {/* Category distribution */}
            <div className="cfa-card cfa-panel">
              <div>
                <div className="cfa-panel-head">
                  <h3 className="cfa-panel-title">
                    <span className="material-symbols-outlined">category</span>
                    Category Distribution
                  </h3>
                  <span className="cfa-panel-note">{total} total</span>
                </div>

                {categoryStats.length === 0 ? (
                  <p className="cfa-empty-note">No data available.</p>
                ) : (
                  <div className="cfa-bars">
                    {categoryStats.map(([category, count], index) => {
                      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                      const share = percent(count, total);

                      return (
                        <div key={category}>
                          <div className="cfa-bar-row-head">
                            <span className="cfa-bar-label">
                              <span className="cfa-dot" style={{ background: color }} />
                              <span>{category}</span>
                            </span>
                            <span className="cfa-bar-value">
                              {share}% <small>({count})</small>
                            </span>
                          </div>
                          <div className="cfa-bar-track">
                            <div
                              className="cfa-bar-fill"
                              style={{ width: `${share}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="cfa-panel-foot">
                <span>
                  {categoryStats.length > 0
                    ? `Top category: ${categoryStats[0][0]}`
                    : "No categories yet"}
                </span>
                <em style={{ color: "#60a5fa" }}>Live breakdown</em>
              </div>
            </div>

            {/* Priority distribution */}
            <div className="cfa-card cfa-panel">
              <div>
                <div className="cfa-panel-head">
                  <h3 className="cfa-panel-title">
                    <span className="material-symbols-outlined" style={{ color: "#fbbf24" }}>
                      priority_high
                    </span>
                    Priority Distribution
                  </h3>
                  <span className="cfa-panel-note">AI-detected urgency</span>
                </div>

                <div className="cfa-priority-grid">
                  {priorityStats.map(item => (
                    <div
                      key={item.name}
                      className={`cfa-priority-tile is-${item.name.toLowerCase()}`}
                    >
                      <div className="cfa-priority-tile-head">
                        <span>{item.name}</span>
                        <span className="cfa-dot" />
                      </div>
                      <strong>{item.count}</strong>
                      <small>{PRIORITY_HINTS[item.name]}</small>
                    </div>
                  ))}
                </div>

                <div className="cfa-bars">
                  {priorityStats.map(item => (
                    <div key={item.name}>
                      <div className="cfa-bar-row-head">
                        <span className="cfa-bar-label">{item.name}</span>
                        <span className="cfa-bar-value">
                          {percent(item.count, total)}%
                        </span>
                      </div>
                      <div className="cfa-bar-track">
                        <div
                          className="cfa-bar-fill"
                          style={{
                            width: `${percent(item.count, total)}%`,
                            background:
                              item.name === "High"
                                ? "#ef4444"
                                : item.name === "Medium"
                                ? "#f59e0b"
                                : "#22c55e"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cfa-panel-foot">
                <span>High priority: {percent(highPriorityCount, total)}% of issues</span>
                <em style={{ color: "#f87171" }}>{highPriorityCount} need attention</em>
              </div>
            </div>

            {/* Status distribution */}
            <div className="cfa-card cfa-panel">
              <div>
                <div className="cfa-panel-head">
                  <h3 className="cfa-panel-title">
                    <span className="material-symbols-outlined" style={{ color: "#34d399" }}>
                      stacked_bar_chart
                    </span>
                    Status Distribution
                  </h3>
                  <span className="cfa-panel-note">Workflow stage</span>
                </div>

                <div className="cfa-stack" aria-hidden="true">
                  {statusStats.map(item => (
                    <span
                      key={item.name}
                      title={`${item.name} (${percent(item.count, total)}%)`}
                      style={{
                        width: `${percent(item.count, total)}%`,
                        background: STATUS_COLORS[item.name]
                      }}
                    />
                  ))}
                </div>

                <div className="cfa-status-list">
                  {statusStats.map(item => (
                    <div className="cfa-status-row" key={item.name}>
                      <span className="cfa-bar-label">
                        <span
                          className="cfa-dot"
                          style={{ background: STATUS_COLORS[item.name] }}
                        />
                        <span>{item.name}</span>
                      </span>
                      <strong>
                        {item.count} {item.count === 1 ? "issue" : "issues"} (
                        {percent(item.count, total)}%)
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cfa-panel-foot">
                <span>Overall completion rate: {completionRate}%</span>
                <em style={{ color: "#34d399" }}>{resolved} resolved</em>
              </div>
            </div>
          </section>

          {/* Active Issues Management */}
          <section id="issues" className="cfa-card cfa-issues cfa-anchor">
            <div className="cfa-issues-head">
              <div>
                <h2>
                  <span className="material-symbols-outlined">table_rows</span>
                  Active Issues Management
                </h2>
                <p>View, analyse and manage campus complaints.</p>
              </div>

              <div className="cfa-filters">
                <span className="cfa-filters-label">Quick Filter:</span>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Sort order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>

                <button
                  type="button"
                  className="cfa-refresh"
                  onClick={loadDashboard}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined cfa-icon-sm">refresh</span>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {issues.length === 0 ? (
              <p className="cfa-table-empty">No issues reported yet.</p>
            ) : filteredIssues.length === 0 ? (
              <p className="cfa-table-empty">No matching issues found.</p>
            ) : (
              <div className="cfa-table-wrap">
                <table className="cfa-table">
                  <thead>
                    <tr>
                      <th>Issue ID</th>
                      <th>Issue Details</th>
                      <th>Student</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Department</th>
                      <th>Reported</th>
                      <th>Status</th>
                      <th>Update</th>
                      <th className="cfa-center">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredIssues.map(issue => {
                      const isOpen = expandedIssue === issue.id;
                      const history = histories[issue.id];
                      const priority = issue.priority || "Medium";
                      const statusKey = slug(issue.status);

                      return (
                        <Fragment key={issue.id}>
                          <tr className={`cfa-row ${isOpen ? "is-open" : ""}`}>
                            <td className="cfa-id" data-label="Issue ID">
                              #{issue.id}
                            </td>

                            <td className="cfa-issue-cell" data-label="Issue">
                              <strong className="cfa-issue-title">{issue.title}</strong>
                              <p className="cfa-issue-desc">{issue.description}</p>

                              {/* Uploaded issue image */}
                              {issue.image_url ? (
                                <a
                                  className="cfa-thumb"
                                  href={`${API_BASE_URL}${issue.image_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={`${API_BASE_URL}${issue.image_url}`}
                                    alt={`Issue ${issue.id}`}
                                  />
                                </a>
                              ) : (
                                <p className="cfa-no-image">No image attached</p>
                              )}

                              <details className="cfa-ai">
                                <summary>✦ View AI Recommendation</summary>
                                <p>
                                  {issue.recommendation ||
                                    "No AI recommendation available."}
                                </p>
                              </details>
                            </td>

                            <td data-label="Student">
                              <div className="cfa-person">
                                <strong>{issue.student_name || "Unknown"}</strong>
                                <small>{issue.student_email || "No email"}</small>
                              </div>
                            </td>

                            <td data-label="Category">
                              <span className="cfa-pill cfa-cat">
                                {issue.category || "Other"}
                              </span>
                            </td>

                            <td data-label="Priority">
                              <span
                                className={`cfa-pill cfa-priority-${priority.toLowerCase()}`}
                              >
                                {priority}
                              </span>
                            </td>

                            <td data-label="Department">
                              {issue.department || "Not assigned"}
                            </td>

                            <td className="cfa-dim" data-label="Reported">
                              {formatDate(issue.created_at, {
                                dateStyle: "medium",
                                timeStyle: "short"
                              })}
                            </td>

                            <td data-label="Status">
                              <span className={`cfa-pill cfa-status-${statusKey}`}>
                                <span className="cfa-status-dot" />
                                {issue.status}
                              </span>
                            </td>

                            <td data-label="Update">
                              <div>
                                <select
                                  className={`cfa-status-select is-${statusKey}`}
                                  aria-label={`Update status for issue ${issue.id}`}
                                  value={issue.status}
                                  disabled={updatingId === issue.id}
                                  onChange={(e) =>
                                    updateStatus(issue.id, e.target.value)
                                  }
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Resolved">Resolved</option>
                                </select>

                                {updatingId === issue.id && (
                                  <small className="cfa-updating">Updating...</small>
                                )}
                              </div>
                            </td>

                            <td className="cfa-center" data-label="History">
                              <button
                                type="button"
                                className={`cfa-history-btn ${isOpen ? "is-open" : ""}`}
                                aria-expanded={isOpen}
                                onClick={() => toggleHistory(issue.id)}
                              >
                                <span>{isOpen ? "Hide" : "History"}</span>
                                <span className="material-symbols-outlined">
                                  expand_more
                                </span>
                              </button>
                            </td>
                          </tr>

                          {isOpen && (
                            <tr className="cfa-history-row">
                              <td colSpan={10}>
                                <div className="cfa-history">
                                  <div className="cfa-history-head">
                                    <strong>
                                      <span className="material-symbols-outlined cfa-icon-md">
                                        history
                                      </span>
                                      Activity Timeline — #{issue.id}
                                    </strong>
                                    {history && (
                                      <small>Total events: {history.length + 1}</small>
                                    )}
                                  </div>

                                  {!history ? (
                                    <p className="cfa-history-empty">Loading history...</p>
                                  ) : (
                                    <>
                                      <div className="cfa-timeline">
                                        <div className="cfa-event">
                                          <span className="cfa-event-icon is-reported">
                                            <span className="material-symbols-outlined">
                                              person
                                            </span>
                                          </span>
                                          <div>
                                            <strong>Reported by student</strong>
                                            <p>{issue.student_name || "Unknown"}</p>
                                            <small>
                                              {formatDate(issue.created_at)}
                                            </small>
                                          </div>
                                        </div>

                                        {history.map(item => (
                                          <div className="cfa-event" key={item.id}>
                                            <span
                                              className={`cfa-event-icon is-${slug(
                                                item.new_status
                                              )}`}
                                            >
                                              <span className="material-symbols-outlined">
                                                {STATUS_ICONS[item.new_status] ||
                                                  "assignment_turned_in"}
                                              </span>
                                            </span>
                                            <div>
                                              <strong>
                                                {item.old_status || "New"} →{" "}
                                                {item.new_status}
                                              </strong>
                                              <p>Status updated by administrator.</p>
                                              <small>
                                                {formatDate(item.changed_at)}
                                              </small>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {history.length === 0 && (
                                        <p className="cfa-history-empty">
                                          No status changes recorded yet.
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="cfa-issues-foot">
              Showing <strong>{filteredIssues.length}</strong> of{" "}
              <strong>{total}</strong> issues
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
