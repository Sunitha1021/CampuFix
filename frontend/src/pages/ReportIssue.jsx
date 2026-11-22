
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUpload, apiRequest } from "../services/api";
import "./ReportIssue.css";

const CATEGORIES = [
  { value: "Electrical", icon: "bolt" },
  { value: "Plumbing", icon: "plumbing" },
  { value: "Wi-Fi", icon: "wifi" },
  { value: "Cleanliness", icon: "cleaning_services" },
  { value: "Infrastructure", icon: "domain" },
];

const TITLE_MAX_LENGTH = 200;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Icon({ name, className = "" }) {
  return (
    <span className={`student-report-icon ${className}`}>
      {name}
    </span>
  );
}

export default function ReportIssue() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electrical");

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Clean up the previous image preview URL.
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Validate and process the selected image.
  function processSelectedFile(file, inputElement = null) {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      if (inputElement) inputElement.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      if (inputElement) inputElement.value = "";
      return;
    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  // Handle normal file selection.
  function handleImageChange(e) {
    const selectedFile = e.target.files?.[0];

    // Do not clear the existing image if the user cancels the picker.
    if (selectedFile) {
      processSelectedFile(selectedFile, e.target);
    }
  }

  // Drag-and-drop handlers.
  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];

    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  }

  // Remove selected image.
  function removeImage() {
    setImage(null);
    setPreview("");
    setFileInputKey((previous) => previous + 1);
    setError("");
  }

  // Submit the issue to the backend.
  async function submitIssue() {
    const formData = new FormData();

    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", category);

    if (image) {
      formData.append("image", image);
    }

    await apiUpload("/issues/with-image", formData);

    navigate("/my-issues");
  }

  // Check for similar issues before submission.
  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);

    if (!title.trim() || !description.trim()) {
      setError("Please fill in the issue title and description.");
      return;
    }

    try {
      setLoading(true);

      const duplicateData = await apiRequest(
        "/issues/check-duplicate",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            category,
          }),
        }
      );

      if (
        duplicateData.duplicates &&
        duplicateData.duplicates.length > 0
      ) {
        setDuplicateMatches(duplicateData.duplicates);
        setShowDuplicateWarning(true);
        setLoading(false);
        return;
      }

      await submitIssue();
    } catch (err) {
      setError(err.message || "Unable to submit your issue. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Continue submission even if similar issues are found.
  async function handleContinueSubmission() {
    try {
      setLoading(true);
      setError("");
      await submitIssue();
    } catch (err) {
      setError(err.message || "Unable to submit your issue. Please try again.");
      setLoading(false);
    }
  }

  // Logout.
  function handleLogout() {
    localStorage.removeItem("campusfix_token");
    localStorage.removeItem("campusfix_user");
    navigate("/login");
  }

  return (
    <div className="student-report-shell">
      {/* Sidebar */}
      <aside className="student-report-sidebar">
        <div className="student-report-brand">
          <div className="student-report-brand-icon">
            <Icon name="school" />
          </div>

          <div className="student-report-brand-text">
            <h2>CampusFix</h2>
            <span>Student Portal</span>
          </div>
        </div>

        <nav className="student-report-nav">
          <Link to="/dashboard" className="student-report-nav-link">
            <Icon name="dashboard" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/report"
            className="student-report-nav-link active"
          >
            <Icon name="add_circle" />
            <span>Report Issue</span>
          </Link>

          <Link to="/my-issues" className="student-report-nav-link">
            <Icon name="list_alt" />
            <span>My Issues</span>
          </Link>
        </nav>

        <div className="student-report-sidebar-bottom">
          <button
            type="button"
            className="student-report-logout"
            onClick={handleLogout}
          >
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="student-report-main">
        <header className="student-report-header">
          <div className="student-report-breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <Icon name="chevron_right" />
            <span>Report Issue</span>
          </div>

          <Link
            to="/dashboard"
            className="student-report-header-link"
          >
            <Icon name="arrow_back" />
            Back to Dashboard
          </Link>
        </header>

        <div className="student-report-content">
          <section className="student-report-heading">
            <div>
              <span className="student-report-eyebrow">
                STUDENT SUPPORT
              </span>

              <h1>Report a Campus Issue</h1>

              <p>
                Help us make your campus better. Tell us what's wrong
                and our team will look into it.
              </p>
            </div>
          </section>

          <div className="student-report-layout">
            {/* Issue form */}
            <section className="student-report-form-card">
              <div className="student-report-card-heading">
                <div>
                  <h2>Issue Details</h2>
                  <p>Provide the information about the issue.</p>
                </div>

                <span className="student-report-required">
                  * Required fields
                </span>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Issue title */}
                <div className="student-report-field">
                  <label htmlFor="issue-title">
                    Issue Title <span>*</span>
                  </label>

                  <input
                    id="issue-title"
                    type="text"
                    placeholder="e.g. Water leakage in Block A"
                    value={title}
                    maxLength={TITLE_MAX_LENGTH}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />

                  <div className="student-report-field-footer">
                    <span>Give your issue a short, clear title.</span>
                    <span>
                      {title.length}/{TITLE_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* Category */}
                <div className="student-report-field">
                  <label>
                    Issue Category <span>*</span>
                  </label>

                  <div className="student-report-category-grid">
                    {CATEGORIES.map((item) => (
                      <label
                        key={item.value}
                        className={`student-report-category-option ${
                          category === item.value ? "selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={item.value}
                          checked={category === item.value}
                          onChange={() => setCategory(item.value)}
                        />

                        <Icon name={item.icon} />
                        <span>{item.value}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="student-report-field">
                  <label htmlFor="issue-description">
                    Issue Description <span>*</span>
                  </label>

                  <textarea
                    id="issue-description"
                    placeholder="Describe the issue in detail. Include the location and any other useful information..."
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />

                  <div className="student-report-field-footer">
                    <span>
                      Mention the exact location so the team can find it.
                    </span>
                  </div>
                </div>

                {/* Image upload */}
                <div className="student-report-field">
                  <label>
                    Attach Image <span className="optional">(Optional)</span>
                  </label>

                  {!preview ? (
                    <label
                      className={`student-report-upload ${
                        dragActive ? "drag-active" : ""
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        key={fileInputKey}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="student-report-sr"
                      />

                      <Icon name="cloud_upload" />

                      <strong>Click to upload or drag and drop</strong>

                      <span>
                        JPG, PNG or WEBP (maximum 5 MB)
                      </span>
                    </label>
                  ) : (
                    <div className="student-report-preview">
                      <img src={preview} alt="Issue attachment preview" />

                      <div className="student-report-preview-details">
                        <strong>{image?.name}</strong>
                        <span>
                          {image ? formatFileSize(image.size) : ""}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="student-report-remove-image"
                        onClick={removeImage}
                        aria-label="Remove uploaded image"
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div className="student-report-error">
                    <Icon name="error" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Duplicate warning */}
                {showDuplicateWarning && (
                  <div className="student-report-duplicate">
                    <div className="student-report-duplicate-heading">
                      <Icon name="warning" />
                      <div>
                        <strong>Similar issues found</strong>
                        <p>
                          We found existing issues that may be related
                          to your report. Please review them before
                          continuing.
                        </p>
                      </div>
                    </div>

                    <div className="student-report-duplicate-list">
                      {duplicateMatches.map((match) => (
                        <div
                          key={match.id}
                          className="student-report-duplicate-item"
                        >
                          <div>
                            <strong>#{match.id} — {match.title}</strong>
                            <span>
                              {match.category} · {match.status}
                            </span>
                          </div>

                          <span className="student-report-similarity">
                            {Math.round(match.similarity * 100)}% match
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="student-report-duplicate-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDuplicateWarning(false);
                          setDuplicateMatches([]);
                        }}
                        className="student-report-review-button"
                        disabled={loading}
                      >
                        Review Details
                      </button>

                      <button
                        type="button"
                        onClick={handleContinueSubmission}
                        className="student-report-continue-button"
                        disabled={loading}
                      >
                        {loading
                          ? "Submitting..."
                          : "Continue & Submit Anyway"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                {!showDuplicateWarning && (
                  <div className="student-report-submit-area">
                    <button
                      type="submit"
                      className="student-report-submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Icon name="progress_activity" />
                          Checking...
                        </>
                      ) : (
                        <>
                          Submit Issue
                          <Icon name="arrow_forward" />
                        </>
                      )}
                    </button>

                    <span>
                      Your issue will be reviewed by the campus
                      administration team.
                    </span>
                  </div>
                )}
              </form>
            </section>

            {/* Information panel */}
            <aside className="student-report-info">
              <div className="student-report-info-card">
                <div className="student-report-info-icon">
                  <Icon name="auto_awesome" />
                </div>

                <h3>Smart Issue Analysis</h3>

                <p>
                  CampusFix uses AI to analyse your report and help
                  identify its category, priority and responsible
                  department.
                </p>

                <div className="student-report-info-steps">
                  <div>
                    <Icon name="fact_check" />
                    <span>
                      <strong>AI Analysis</strong>
                      <small>Issue classification and priority</small>
                    </span>
                  </div>

                  <div>
                    <Icon name="assignment_ind" />
                    <span>
                      <strong>Admin Review</strong>
                      <small>Your report is reviewed</small>
                    </span>
                  </div>

                  <div>
                    <Icon name="track_changes" />
                    <span>
                      <strong>Track Progress</strong>
                      <small>Follow updates in My Issues</small>
                    </span>
                  </div>
                </div>
              </div>

              <div className="student-report-tips-card">
                <h3>
                  <Icon name="lightbulb" />
                  Reporting Tips
                </h3>

                <ul>
                  <li>Use a clear and descriptive title.</li>
                  <li>Mention the exact campus location.</li>
                  <li>Explain the problem in simple words.</li>
                  <li>Attach a photo if it helps explain the issue.</li>
                </ul>
              </div>

              <div className="student-report-emergency-card">
                <Icon name="info" />

                <div>
                  <strong>Urgent issue?</strong>
                  <p>
                    For immediate safety concerns, contact your
                    campus administration directly.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
