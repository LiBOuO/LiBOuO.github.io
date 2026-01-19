# --- 檔案位置：backend/database.py ---
from sqlmodel import create_engine, SQLModel
import os

# 將這裏替換為你在 Neon 取得的 Connection String
# 建議之後改用環境變數存儲
sqlite_url = 'postgresql://neondb_owner:npg_AR6auLzw2Pvn@ep-broad-dust-a1ros3v8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# 建立引擎 (PostgreSQL 不需要像 SQLite 那樣設定 check_same_thread)
engine = create_engine(sqlite_url, echo=True)

def init_db():
    import models 
    SQLModel.metadata.create_all(engine)