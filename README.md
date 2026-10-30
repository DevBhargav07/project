# Project

A full-stack web application built as a learning project for backend architecture, authentication, authorization, database design, and modern frontend development.

The project combines a FastAPI backend with a React + Vite frontend, using PostgreSQL for production-ready data management and SQLAlchemy for ORM-based database access.

## Overview

This project demonstrates:

- FastAPI backend APIs with async database operations
- JWT-based authentication
- Role and permission-based authorization
- User, group, and permission management
- Real-time messaging and chat features
- PostgreSQL-ready architecture
- React frontend for user interaction

It is designed as a practical learning path for system design, backend services, user management, and scalable application patterns.

## Tech Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL / AsyncPG
- JWT / OAuth-style auth patterns
- Pydantic
- Passlib + Argon2

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- Axios
- React Router

## Project Structure

```text
project/
├── api/
│   └── index.py
├── backend/
│   ├── alembic/
│   ├── app/
│   ├── .python-version
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── .gitignore
├── learning.md
├── README.md
├── requirements.txt
├── vercel.json
└── .env.example (if added later)
```

## Core Features

### Authentication and Authorization
- User registration and login
- JWT authentication flow
- Role-based and permission-based access control
- Group and permission management for users
- Active/superuser status handling

### Messaging and Chat
- Conversation management
- Message sending and retrieval
- Expiring message support
- Messaging routes and chat-related backend APIs

### Database and ORM
- SQLAlchemy models for users, groups, permissions, regions, conversations, and messages
- Alembic migrations for schema changes
- PostgreSQL integration with async database access
- Database configuration via environment variables

## Application Flow

```text
Frontend (React)
   -> API requests to FastAPI
   -> SQLAlchemy models
   -> PostgreSQL database
   -> Auth and permission checks
```

## Getting Started

### Prerequisites

Before running this project, make sure you have installed:

- Python 3.11+
- Node.js 18+
- npm or yarn
- PostgreSQL
- Optional: Docker for local database setup

### 1. Clone the Repository

```bash
git clone https://github.com/DevBhargav07/project.git
cd project
```

### 2. Backend Setup

Go to the backend directory:

```bash
cd backend
```

Create a `.env` file in the backend folder with the required variables:

```env
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/project_db
SECRET_KEY=your_secret_key_here
CORS_ORIGINS=http://localhost:5173
```

Install dependencies:

```bash
pip install -r ../requirements.txt
```

Or with uv:

```bash
uv sync
```

Run the backend server:

```bash
uvicorn app.main:app --reload
```

The API will be available at:

```text
http://localhost:8000
```

### 3. Frontend Setup

Open a new terminal and move to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the React app:

```bash
npm run dev
```

The frontend will run at:

```text
http://localhost:5173
```

## Database Configuration

This project is designed to use PostgreSQL instead of SQLite in production. The database connection is configured through environment variables and the `DATABASE_URL` setting.

The project also includes Alembic migrations for database version control.

### Common migration commands

```bash
cd backend
alembic revision --autogenerate -m "add new table"
alembic upgrade head
alembic downgrade -1
```

## Authentication Notes

The backend uses password hashing and token-based validation patterns for secure user access. Permissions and groups are stored in the database and checked through authorization logic in the application.

## Development Notes

This repository is used as a hands-on learning project for:

- System design and scalable architecture
- API design with FastAPI
- Security and authorization
- SQLAlchemy and PostgreSQL migration workflows
- Frontend-backend integration
- Real-world app patterns using modern tools

## Future Improvements

Possible improvements for this project include:

- Better API documentation and Swagger customization
- Advanced pagination and filtering
- Real-time notification support
- Admin dashboards and reporting
- Improved deployment and CI/CD setup
- Testing with pytest
- Docker Compose for local development

## License

This project is for learning and experimentation purposes.

## Author

Developed by DevBhargav07.
