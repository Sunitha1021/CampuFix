
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./MyIssues.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const STATUS_ICONS = {
  Pending: "schedule",
  "In Progress": "engineering",
  Resolved: "check_circle"
};

// Backend timestamps without a timezone are treated as UTC.
function formatDate(dateString) {
  if (!dateString) return "Date unavailable";

  const text = String(dateString);
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(text);
  const date = new Date(hasTimezone ? text : `${text}Z`);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getStatusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

function Icon({ name, className = "" }) {
  return (
    <span
      className={`student-issues-icon ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`student-issues-status is-${getStatusClass(status)}`}>
      <span className="student-issues-status-dot" />
      {status || "Unknown"}
    </span>
  );
}

function IssueImage({ issue }) {
  if (!issue.image_url) return null;

  return (
    <div className="student-issues-image">
      <img
        src={`${API_BASE_URL}${issue.image_url}`}
        alt={`Image for ${issue.title}`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <span className="student-issues-image-tag">
        <Icon name="photo_camera" className="student-issues-icon-sm" />
        Attached Image
      </span>
    </div>
  );
}

// Full issue details and status history.
function IssueDetails({ issue, history }) {
  const priority = issue.priority || "Medium";

  return (
    <div className="student-issues-details">
      <div className="student-issues-details-head">
        <div>
          <span className="student-issues-eyebrow">Selected Ticket</span>
          <h2>Issue Details — #{issue.id}</h2>
        </div>
        <StatusBadge status={issue.status} />
      </div>

      <h3 className="student-issues-details-title">{issue.title}</h3>

      <p className="student-issues-details-desc">
        {issue.description}
      </p>

      <IssueImage issue={issue} />

      <dl className="student-issues-meta">
        <div>
          <dt>Assigned Department</dt>
          <dd>{issue.department || "Not assigned"}</dd>
        </div>

        <div>
          <dt>AI Priority</dt>
          <dd>
            <span className={`student-issues-priority is-${String(priority).toLowerCase()}`}>
              {priority}
            </span>
          </dd>
        </div>

        <div>
          <dt>AI Category</dt>
          <dd>{issue.category || "Other"}</dd>
        </div>

        <div>
          <dt>Reported On</dt>
          <dd>{formatDate(issue.created_at)}</dd>
        </div>
      </dl>

      <div className="student-issues-ai">
        <div className="student-issues-ai-title">
          <Icon name="auto_awesome" className="student-issues-icon-md" />
          <span>AI Recommendation</span>
        </div>

        <p>
          {issue.recommendation ||
            "No AI recommendation available for this issue."}
        </p>
      </div>

      <div className="student-issues-timeline">
        <h3>Status Timeline</h3>

        <ol>
          <li>
            <span className="student-issues-dot is-reported">
              <Icon name="flag" className="student-issues-icon-sm" />
            </span>

            <div>
              <strong>Issue Reported</strong>
              <p>Your complaint was successfully submitted.</p>
              <small>{formatDate(issue.created_at)}</small>
            </div>
          </li>

          {history.map((item) => (
            <li key={item.id}>
              <span
                className={`student-issues-dot is-${getStatusClass(item.new_status)}`}
              >
                <Icon
                  name={STATUS_ICONS[item.new_status] || "sync_alt"}
                  className="student-issues-icon-sm"
                />
              </span>

              <div>
                <strong>
                  {item.old_status || "New"} → {item.new_status}
                </strong>
                <p>Status updated by administrator.</p>
                <small>{formatDate(item.changed_at)}</small>
              </div>
            </li>
          ))}

          <li>
            <span
              className={`student-issues-dot ${
                issue.status === "Resolved" ? "is-resolved" : "is-current"
              }`}
            >
              <Icon
                name={
                  issue.status === "Resolved"
                    ? "check_circle"
                    : "radio_button_checked"
                }
                className="student-issues-icon-sm"
              />
            </span>

            <div>
              <strong className="student-issues-current">
                Current Status: {issue.status || "Unknown"}
              </strong>

              <p>
                {issue.status === "Resolved"
                  ? "Your issue has been resolved."
                  : "Your issue is being tracked."}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

function MyIssues() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [histories, setHistories] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);

  // Load the student's issues and their status histories.
  useEffect(() => {
    async function loadIssues() {
      try {
        const data = await apiRequest("/issues/my");

        setIssues(data);

        const historyResults = await Promise.all(
          data.map(async (issue) => {
            try {
              const history = await apiRequest(
                `/issues/${issue.id}/history`
              );

              return [issue.id, history];
            } catch {
              return [issue.id, []];
            }
          })
        );

        setHistories(Object.fromEntries(historyResults));
      } catch (err) {
        setError(err.message || "Unable to load your issues.");

        const message = String(err.message || "").toLowerCase();

        if (
          message.includes("token") ||
          message.includes("credentials")
        ) {
          localStorage.removeItem("campusfix_token");
          localStorage.removeItem("campusfix_user");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    loadIssues();
  }, [navigate]);

  function logout() {
    localStorage.removeItem("campusfix_token");
    localStorage.removeItem("campusfix_user");
    navigate("/login");
  }

  // Summary counts.
  const total = issues.length;

  const pending = issues.filter(
    (issue) => issue.status === "Pending"
  ).length;

  const inProgress = issues.filter(
    (issue) => issue.status === "In Progress"
  ).length;

  const resolved = issues.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  const categories = [
    ...new Set(
      issues.map((issue) => issue.category).filter(Boolean)
    )
  ];

  // Search and filters.
  const search = searchTerm.toLowerCase().trim().replace(/^#/, "");

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      !search ||
      issue.title?.toLowerCase().includes(search) ||
      issue.description?.toLowerCase().includes(search) ||
      String(issue.id).includes(search);

    const matchesStatus =
      statusFilter === "All" || issue.status === statusFilter;

    const matchesCategory =
      categoryFilter === "All" || issue.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Keep the selected issue within the filtered results.
  const selectedIssue =
    filteredIssues.find((issue) => issue.id === selectedId) ||
    filteredIssues[0] ||
    null;

  const summaryCards = [
    {
      label: "Total Issues",
      value: total,
      hint: "All issues you reported",
      icon: "assignment",
      tone: "total"
    },
    {
      label: "Pending",
      value: pending,
      hint: "Awaiting action",
      icon: "schedule",
      tone: "pending"
    },
    {
      label: "In Progress",
      value: inProgress,
      hint: "Currently being handled",
      icon: "engineering",
      tone: "progress"
    },
    {
      label: "Resolved",
      value: resolved,
      hint: "Successfully completed",
      icon: "check_circle",
      tone: "resolved"
    }
  ];

  return (
    <div className="student-issues-shell">
      {/* Sidebar */}
      <aside className="student-issues-sidebar">
        <div className="student-issues-sidebar-top">
          <div className="student-issues-brand">
            <span className="student-issues-brand-mark">
              <Icon name="home_repair_service" />
            </span>

            <span className="student-issues-brand-name">
              CampusFix
              <span className="student-issues-brand-tag">Student</span>
            </span>
          </div>

          <nav
            className="student-issues-nav"
            aria-label="Main navigation"
          >
            <Link
              className="student-issues-nav-link"
              to="/dashboard"
              title="Dashboard"
            >
              <Icon name="grid_view" />
              <span className="student-issues-nav-text">
                Dashboard
              </span>
            </Link>

            <Link
              className="student-issues-nav-link"
              to="/report"
              title="Report Issue"
            >
              <Icon name="add_circle" />
              <span className="student-issues-nav-text">
                Report Issue
              </span>
            </Link>

            <Link
              className="student-issues-nav-link is-active"
              to="/my-issues"
              aria-current="page"
              title="My Issues"
            >
              <Icon name="assignment" />
              <span className="student-issues-nav-text">
                My Issues
              </span>
            </Link>
          </nav>
        </div>

        <div className="student-issues-sidebar-bottom">
          <button
            type="button"
            className="student-issues-logout"
            onClick={logout}
            title="Logout"
          >
            <Icon name="logout" />
            <span className="student-issues-nav-text">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="student-issues-main">
        <div className="student-issues-content">
          {/* Page header */}
          <header className="student-issues-header">
            <div>
              <p className="student-issues-crumbs">
                <span className="is-primary">Student Portal</span>
                <span aria-hidden="true">/</span>
                <span>Ticket Tracker</span>
              </p>

              <h1>My Issues</h1>

              <p className="student-issues-subtitle">
                Track and manage the campus issues you have reported.
              </p>
            </div>

            <Link
              to="/report"
              className="student-issues-primary-btn"
            >
              <Icon name="add" />
              <span>Report New Issue</span>
            </Link>
          </header>

          {/* Loading and error states */}
          {loading && (
            <p className="student-issues-message" role="status">
              Loading your issues...
            </p>
          )}

          {error && (
            <p className="student-issues-error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              {/* Summary cards */}
              <section
                className="student-issues-summary"
                aria-label="Issue summary"
              >
                {summaryCards.map((card) => (
                  <div
                    className="student-issues-card student-issues-summary-card"
                    key={card.label}
                  >
                    <div>
                      <span className="student-issues-summary-label">
                        {card.label}
                      </span>

                      <strong className="student-issues-summary-value">
                        {card.value}
                      </strong>

                      <span className="student-issues-summary-hint">
                        {card.hint}
                      </span>
                    </div>

                    <span
                      className={`student-issues-summary-icon is-${card.tone}`}
                    >
                      <Icon
                        name={card.icon}
                        className="student-issues-icon-lg"
                      />
                    </span>
                  </div>
                ))}
              </section>

              {issues.length === 0 ? (
                <div className="student-issues-card student-issues-empty">
                  <Icon name="inbox" className="student-issues-icon-xl" />
                  <h3>No issues found</h3>
                  <p>You haven't submitted any campus issues yet.</p>

                  <Link
                    to="/report"
                    className="student-issues-primary-btn"
                  >
                    <Icon name="add" />
                    <span>Report an issue</span>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Search and filters */}
                  <section className="student-issues-card student-issues-filters">
                    <label className="student-issues-search">
                      <Icon name="search" />

                      <input
                        type="text"
                        placeholder="Search issues by title or description..."
                        aria-label="Search issues"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </label>

                    <label className="student-issues-select">
                      <Icon
                        name="filter_list"
                        className="student-issues-icon-md"
                      />

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
                    </label>

                    <label className="student-issues-select">
                      <Icon
                        name="category"
                        className="student-issues-icon-md"
                      />

                      <select
                        aria-label="Filter by category"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="All">All Categories</option>

                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>

                  {/* Issue list and details */}
                  <div className="student-issues-layout">
                    <section
                      className="student-issues-list"
                      aria-label="Your reported issues"
                    >
                      {filteredIssues.length === 0 ? (
                        <div className="student-issues-card student-issues-empty">
                          <Icon
                            name="search_off"
                            className="student-issues-icon-xl"
                          />
                          <h3>No matching issues found</h3>
                          <p>
                            Try adjusting your search query or filter
                            selections.
                          </p>
                        </div>
                      ) : (
                        filteredIssues.map((issue) => {
                          const isSelected =
                            selectedIssue?.id === issue.id;

                          const priority = issue.priority || "Medium";

                          return (
                            <article
                              key={issue.id}
                              className={`student-issues-card student-issues-item ${
                                isSelected ? "is-selected" : ""
                              }`}
                            >
                              <div className="student-issues-item-top">
                                <div className="student-issues-item-heading">
                                  <div className="student-issues-item-meta">
                                    <span className="student-issues-id">
                                      #{issue.id}
                                    </span>

                                    <span>
                                      Reported {formatDate(issue.created_at)}
                                    </span>
                                  </div>

                                  <h2>{issue.title}</h2>
                                </div>

                                <StatusBadge status={issue.status} />
                              </div>

                              <p className="student-issues-item-desc">
                                {issue.description}
                              </p>

                              <div className="student-issues-item-foot">
                                <div className="student-issues-tags">
                                  <span className="student-issues-chip">
                                    <Icon
                                      name="category"
                                      className="student-issues-icon-sm"
                                    />
                                    {issue.category || "Other"}
                                  </span>

                                  <span
                                    className={`student-issues-priority is-${String(priority).toLowerCase()}`}
                                  >
                                    {priority} Priority
                                  </span>

                                  <span className="student-issues-dept">
                                    {issue.department || "Not assigned"}
                                  </span>
                                </div>

                                <div className="student-issues-item-action">
                                  {issue.image_url && (
                                    <img
                                      className="student-issues-thumb"
                                      src={`${API_BASE_URL}${issue.image_url}`}
                                      alt=""
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  )}

                                  <button
                                    type="button"
                                    className="student-issues-view-btn"
                                    aria-pressed={isSelected}
                                    onClick={() => setSelectedId(issue.id)}
                                  >
                                    {isSelected ? "Viewing" : "View Details"}

                                    <Icon
                                      name="chevron_right"
                                      className="student-issues-icon-md"
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Tablet and mobile details */}
                              {isSelected && (
                                <div className="student-issues-inline">
                                  <IssueDetails
                                    issue={issue}
                                    history={histories[issue.id] || []}
                                  />
                                </div>
                              )}
                            </article>
                          );
                        })
                      )}
                    </section>

                    {/* Desktop details panel */}
                    <aside
                      className="student-issues-card student-issues-panel"
                      aria-live="polite"
                    >
                      {selectedIssue ? (
                        <IssueDetails
                          issue={selectedIssue}
                          history={histories[selectedIssue.id] || []}
                        />
                      ) : (
                        <p className="student-issues-panel-empty">
                          Select an issue to see its details.
                        </p>
                      )}
                    </aside>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default MyIssues;
