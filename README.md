# CampusFix – AI-Powered Smart Campus Issue Management System

CampusFix is a web-based campus issue management system that helps students report campus problems and allows administrators to manage, track and resolve them efficiently.

The system uses AI to assist with issue classification and priority assignment, making campus maintenance and issue tracking more organized.

## Features

### Student Portal
- Student registration and login
- Report campus issues with descriptions and images
- AI-based issue category and priority classification
- Duplicate issue detection
- Track reported issues and their status
- View issue status history
- Receive in-app notifications and email updates

### Admin Portal
- Secure admin login
- View and manage reported issues
- Update issue status
- View student details
- Track issue history
- View dashboard statistics and analytics
- Access AI-generated recommendations

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, CSS |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| AI | Google Gemini API |
| Authentication | JWT |
| Email | SMTP |

## Project Structure

```text
CampusFix/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── ai_service.py
│   ├── email_service.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Sunitha1021/CampuFix.git
cd CampuFix
```

### 2. Backend setup

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
python -m pip install -r requirements.txt
```

Configure the required environment variables in a `.env` file inside the backend folder. Add your Gemini API key, JWT secret and email configuration using the exact variable names expected by the application.

Start the backend:

```bash
python -m uvicorn main:app --reload
```

Backend API: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

### 3. Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Security Notes

- API keys and passwords must be stored in environment variables.
- Never commit `.env` files or other credentials.
- The project uses JWT-based authentication and role-based access.

## Future Improvements

- Cloud deployment
- Improved analytics and reporting
- Additional campus departments and issue categories
- Enhanced AI-based issue analysis

## Author

**Sunitha S**

## Application Screenshots

### Student Dashboard
![Student Dashboard](screenshots/student-dashboard.png)

### Report Issue
![Report Issue](screenshots/report-issue.png)

### My Issues
![My Issues](screenshots/my-issues.png)

### Admin Dashboard
![Admin Dashboard](screenshots/admin-dashboard.png)

### Login
![Login](screenshots/login.png)

### Register
![Register](screenshots/register.png)

GitHub: [Sunitha1021](https://github.com/Sunitha1021)

---

*CampusFix – Making campus issue reporting smarter and simpler.*
