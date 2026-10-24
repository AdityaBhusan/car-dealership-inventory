import os
from dotenv import load_dotenv  # pip install python-dotenv if missing
from sqlalchemy import create_engine, text

load_dotenv()
for key in ("DATABASE_URL", "TEST_DATABASE_URL"):
    engine = create_engine(os.environ[key])
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version()")).scalar()
    print(f"{key} OK -> {version[:30]}")