from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import init_mongo, init_redis
from src.routes import nlp, recommendations, leads


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_mongo()
    await init_redis()
    yield


app = FastAPI(
    title="DirApp AI Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nlp.router,             prefix="/api/nlp",             tags=["NLP"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(leads.router,           prefix="/api/leads",           tags=["Leads"])


@app.get("/health")
async def health():
    return {"status": "ok"}
