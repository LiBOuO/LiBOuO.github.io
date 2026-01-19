# --- 檔案位置：backend/models.py ---
from sqlmodel import SQLModel, Field
from typing import Optional

# 記分板資料表
class Score(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_name: str
    points: int = 0

# 評論資料表
class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author: str
    content: str