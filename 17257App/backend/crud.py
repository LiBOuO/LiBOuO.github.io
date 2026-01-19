# --- backend/crud.py ---
from sqlmodel import Session, select
from models import Score, Comment
from database import engine

def get_scores():
    with Session(engine) as session:
        # 必須使用 session.exec()
        statement = select(Score)
        results = session.exec(statement)
        return results.all()

def create_score(score: Score):
    with Session(engine) as session:
        session.add(score)
        session.commit()
        session.refresh(score)
        return score