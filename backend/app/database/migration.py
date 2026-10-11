import sqlite3
import uuid
import secrets
from sqlalchemy import text
from app.core.database import engine, Base

def run_auth_migrations():
    """
    Safely migrates existing database schema to include authentication fields
    without dropping or losing existing tables and data.
    """
    # 1. Inspect existing columns in users table
    with engine.connect() as conn:
        try:
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
        except Exception as e:
            print(f"[Migration] Error inspecting users table: {e}")
            columns = []

        if columns:
            columns_to_add = [
                ("user_uuid", "VARCHAR(36)"),
                ("public_user_id", "VARCHAR(16)"),
                ("is_verified", "BOOLEAN DEFAULT 0"),
                ("is_active", "BOOLEAN DEFAULT 1"),
                ("failed_login_attempts", "INTEGER DEFAULT 0"),
                ("locked_until", "DATETIME")
            ]

            for col_name, col_def in columns_to_add:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                        conn.commit()
                        print(f"[Migration] Added column {col_name} to users table.")
                    except Exception as e:
                        print(f"[Migration] Could not add column {col_name}: {e}")

            # 2. Backfill existing user records with unique user_uuid and public_user_id
            try:
                users_res = conn.execute(text("SELECT id, user_uuid, public_user_id FROM users")).fetchall()
                for u in users_res:
                    user_id, u_uuid, pub_id = u[0], u[1], u[2]
                    needs_update = False
                    new_uuid = u_uuid
                    new_pub_id = pub_id

                    if not new_uuid:
                        new_uuid = str(uuid.uuid4())
                        needs_update = True
                    if not new_pub_id:
                        new_pub_id = f"RM-{secrets.token_hex(4).upper()}"
                        needs_update = True

                    if needs_update:
                        conn.execute(
                            text("UPDATE users SET user_uuid = :u_uuid, public_user_id = :pub_id, is_verified = 1 WHERE id = :uid"),
                            {"u_uuid": new_uuid, "pub_id": new_pub_id, "uid": user_id}
                        )
                conn.commit()
            except Exception as e:
                print(f"[Migration] Error backfilling user records: {e}")

    # 3. Create any new tables (user_sessions, email_verification_otps, password_reset_tokens)
    Base.metadata.create_all(bind=engine)
    print("[Migration] Authentication tables verified & initialized.")
