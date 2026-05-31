from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, tracks

app = FastAPI(title="Liscuss API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://liscuss.vercel.app/"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(tracks.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
