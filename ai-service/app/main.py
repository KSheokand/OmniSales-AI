import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException, Query
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field
from app.agents.sales_agent import run_sales_agent
from app.agents.bundling_agent import get_complementary_products

app = FastAPI(
    title="OmniSales AI",
    description="AI orchestration service for omnichannel retail",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=False,
    allow_methods=["GET","POST","OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "omnisales-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to OmniSales AI",
        "docs": "/docs",
    }

class chatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    customer_id: str = "CUST001"
    location_id: str = "STORE001"
    history: list[chatMessage] = Field(default_factory=list, max_length=20)
    channel: Literal["web", "kiosk", "messaging"] = "web"

@app.post("/api/chat")
async def chat(request: ChatRequest):
    result = await run_sales_agent(
        message=request.message,
        customer_id=request.customer_id,
        location_id=request.location_id,
        history=[
            item.model_dump()
            for item in request.history
        ]
    )

    return result

@app.get("/api/products/{sku}/complementary")
async def complementary_products(
    sku: str,
    location_id: str = Query(default="STORE001"),
):
    try:
        result = await get_complementary_products(
            sku=sku,
            location_id=location_id,
        )
        return result

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve complementary products: {exc}",
        ) from exc