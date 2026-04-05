from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from models.database import create_tables
from routers import auth, chapters, sessions, voice, admin, recap


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(
    title="CBSE AI Math Tutor API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


app.include_router(auth.router)
app.include_router(chapters.router)
app.include_router(sessions.router)
app.include_router(voice.router)
app.include_router(admin.router)
app.include_router(recap.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "CBSE AI Math Tutor"}
