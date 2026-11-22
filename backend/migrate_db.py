import sqlite3
from database import engine, Base
import models

Base.metadata.create_all(bind=engine)

conn = sqlite3.connect("campusfix.db")

columns = [
    row[1]
    for row in conn.execute("PRAGMA table_info(issues)")
]

if "user_id" not in columns:
    conn.execute(
        "ALTER TABLE issues ADD COLUMN user_id INTEGER REFERENCES users(id)"
    )
    print("Added user_id column.")

if "recommendation" not in columns:
    conn.execute(
        "ALTER TABLE issues ADD COLUMN recommendation TEXT"
    )
    print("Added recommendation column.")

if "image_url" not in columns:
    conn.execute(
        "ALTER TABLE issues ADD COLUMN image_url VARCHAR(500)"
    )
    print("Added image_url column.")
if "created_at" not in columns:
    conn.execute(
        "ALTER TABLE issues ADD COLUMN created_at DATETIME"
    )
    conn.execute(
        "UPDATE issues SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
    )
    print("Added created_at column.")
conn.commit()
conn.close()

print("Database migration completed successfully!")

print("Issue history table created successfully!")
