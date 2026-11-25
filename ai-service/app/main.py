from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, agents
from app.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent multi-agent self-healing resilience service for SHARP",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router)
app.include_router(agents.router)

@app.get("/")
async def root():
    return {
        "platform": "SHARP",
        "service": "AI Intelligence Service",
        "status": "OPERATIONAL",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.AI_SERVICE_HOST, port=settings.AI_SERVICE_PORT, reload=True)
