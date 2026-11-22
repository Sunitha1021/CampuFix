# CampusFix – AI-Powered Smart Campus Issue Management System

CampusFix is a web-based campus issue management system that helps students report campus problems and allows administrators to manage, track, and resolve them efficiently.

The system uses AI to classify reported issues, suggest priorities, and recommend the appropriate department.

## Features

### Student Portal
- Student registration and login
- Report campus issues with descriptions and images
- AI-based issue classification and priority suggestions
- Duplicate issue detection
- Track issue status and history
- Receive notifications when issue status changes

### Admin Portal
- Secure administrator login
- View and manage reported issues
- Update issue status
- View student details and uploaded images
- Dashboard statistics and analytics
- View issue status history

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite, CSS |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| AI Integration | Google Gemini API |
| Authentication | JWT |
| Email Notifications | Gmail SMTP |
| Version Control | Git and GitHub |

## Project Structure

```text
CampusFix/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── ai_service.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── screenshots/
└── README.md
```

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/Sunitha1021/CampuFix.git
cd CampuFix
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables in a `backend/.env` file before starting the server.

Run:

```bash
python -m uvicorn main:app --reload
```

Backend API: `http://127.0.0.1:8000`

API documentation: `http://127.0.0.1:8000/docs`

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Security Notes

- Environment variables and API credentials are not included in the repository.
- Database files and uploaded user files are excluded from Git.
- Authentication and role-based access control are implemented.

## Future Improvements

- Cloud deployment
- Improved AI-based issue analysis
- Additional reporting and analytics
- More advanced campus communication features

## Author

**Sunitha S**

GitHub: [Sunitha1021](https://github.com/Sunitha1021)