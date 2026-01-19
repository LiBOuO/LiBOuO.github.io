from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 1. 引入中間件
from contextlib import asynccontextmanager
from database import init_db
import crud
from models import Score, Comment

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

# 2. 設定 CORS 授權
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"], # 允許前端來源
    allow_credentials=True,
    allow_methods=["*"], # 允許所有方法 (GET, POST, PUT, DELETE 等)
    allow_headers=["*"], # 允許所有 Header
)

# 記分板 API
@app.post("/api/scores")
async def add_score(score: Score):
    return crud.create_score(score)

@app.get("/api/scores")
async def list_scores():
    return crud.get_scores()

# 評論區 API
@app.post("/api/comments")
async def add_comment(comment: Comment):
    return crud.create_comment(comment)

@app.get("/api/comments")
async def list_comments():
    return crud.get_comments()