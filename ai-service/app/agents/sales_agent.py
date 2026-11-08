import json
import re
from ollama import chat
from typing import TypedDict, Any

from langgraph.graph import StateGraph, START, END


from app.tools.commerce import (
    get_customer,
    get_recommendations,
)


class SalesAgentState(TypedDict, total=False):
    message: str
    customer_id: str
    budget: float
    category: str
    location_id: str
    colors: list[str]
    occasion: str

    customer: dict[str, Any]
    recommendations: dict[str, Any]
    response: str
    history: list[dict[str, str]]
    error: str


async def understand_request(state: SalesAgentState) -> dict:
    """Use the local Ollama model to understand a shopping request"""

    message= state["message"]

    history = state.get("history", [])

    recent_history = [
        item for item in history[-10:]
        if item.get("role") in {"user", "assistant"}
        and isinstance(item.get("content"),str)
    ]

    history_text = "\n".join(
        f"{item['role'].upper()}: {item['content']}"
        for item in recent_history
    )

    prompt = f"""
You extract shopping preferences from a conversation.

Previous conversation:
{history_text or "No previous coversation."}

Current customer message:
{message}

Return ONLY a JSON object with these fields:
- budget: number or null
- category: one of "formalwar", "casualwear", "outerwear", or null
- colors: array of color names
- occasion: short string or null

Rules:
- Resolve references such as "that budget", "the first one", and "those trousers"
  using the conversation where possible.
- If the customer changes a preference, use the latest preference.
- Preserve earlier preferences when the customer is clearly continuing the same request.
- Budget must be a number in Indian rupees.
- Use null for a budget that cannot be determined.
- Do not invent product details, SKUs, prices, or stock.
- Use an empty array if no colors can be determined.
- Return valid JSON only.
"""

    try:
        result = await __import__("asyncio").to_thread(
            chat,
            model="qwen3:1.7b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You extract shopping preferences accurately."
                        "Return structured JSON and do not answer the customer."
                    ),
                },
                {"role":"user","content":prompt},
            ],
            format="json",
            options={"temperature": 0},
        )

        extracted = json.loads(result.message.content)

    except Exception as exc:
        print(f"LLM extraction failed; using defaults: {exc}")
        extracted = {}

    budget = extracted.get("budget")
    if not isinstance(budget, (int,float)) or isinstance(budget, bool):
        budget=state.get("budget",5000)

    category=extracted.get("category")
    allowed_categories={"formalwear","casualwear","outerwear"}

    if category not in allowed_categories:
        category=state.get("category","formalwear")

    colors=extracted.get("colors",[])
    if not isinstance(colors, list):
        colors=[]

    occasion=extracted.get("occasion")
    if not isinstance(occasion, str):
        occasion=""

    return {
        "customer_id": state.get("customer_id", "CUST001"),
        "budget": float(budget),
        "category": category,
        "location_id": state.get("location_id", "STORE001"),
        "colors": [c.lower() for c in colors if isinstance(c, str)],
        "occasion": occasion.lower(),
    }

async def retrieve_customer(state: SalesAgentState) -> dict:
    """Fetch the customer's profile from the commerce backend."""

    try:
        customer = await get_customer(state["customer_id"])
        return {"customer": customer}
    except Exception as exc:
        return {"error": f"Could not retrieve customer profile: {exc}"}


async def recommend_products(state: SalesAgentState) -> dict:
    """Call the existing recommendation API."""

    if state.get("error"):
        return {}

    try:
        recommendations = await get_recommendations(
            customer_id=state["customer_id"],
            budget=state["budget"],
            category=state["category"],
            location_id=state["location_id"],
            colors=state.get("colors",[]),
            occasion=state.get("occasion") or None,
        )

        return {"recommendations": recommendations}

    except Exception as exc:
        return {"error": f"Could not retrieve recommendations: {exc}"}


def create_shopping_response(state: SalesAgentState) -> dict:
    """Convert recommendation results into a readable shopping response."""

    if state.get("error"):
        return {"response": state["error"]}

    result = state.get("recommendations", {})
    products = result.get("recommendations", [])

    if not products:
        return {
            "response": (
                f"I couldn't find matching in-stock products under "
                f"₹{state['budget']:.0f}. Try a higher budget or another category."
            )
        }

    lines = [
        f"Here are your recommendations under ₹{state['budget']:.0f}:",
        "",
    ]

    for index, product in enumerate(products[:5], start=1):
        lines.append(
            f"{index}. {product['name']} "
            f"({product['sku']}) — ₹{product['price']:.0f}"
        )

        lines.append(f"   Colour: {product.get('color', 'Not specified')}")
        lines.append(
            f"   Available quantity: {product.get('availableQuantity', 0)}"
        )

        reasons = product.get("reasons", [])
        if reasons:
            lines.append(f"   Why it matches: {', '.join(reasons)}")

        lines.append("")

    lines.append(
        f"Store: {state['location_id']}. "
        "Availability should be confirmed again before purchase."
    )

    return {"response": "\n".join(lines)}


def build_sales_agent():
    """Construct and compile the LangGraph workflow."""

    graph = StateGraph(SalesAgentState)

    graph.add_node("understand_request", understand_request)
    graph.add_node("retrieve_customer", retrieve_customer)
    graph.add_node("recommend_products", recommend_products)
    graph.add_node("create_response", create_shopping_response)

    graph.add_edge(START, "understand_request")
    graph.add_edge("understand_request", "retrieve_customer")
    graph.add_edge("retrieve_customer", "recommend_products")
    graph.add_edge("recommend_products", "create_response")
    graph.add_edge("create_response", END)

    return graph.compile()


sales_agent = build_sales_agent()


async def run_sales_agent(
    message: str,
    customer_id: str = "CUST001",
    location_id: str = "STORE001",
    history: list[dict[str,str]] | None =None,
) -> dict:
    """Public entry point for the sales agent."""

    result = await sales_agent.ainvoke(
        {
            "message": message,
            "customer_id": customer_id,
            "location_id": location_id,
            "history": history or [],
        }
    )

    return {
        "customerId": result.get("customer_id"),
        "budget": result.get("budget"),
        "category": result.get("category"),
        "locationId": result.get("location_id"),
        "colors": result.get("colors",[]),
        "occasion": result.get("occasion",""),
        "response": result.get("response"),
        "recommendations": result.get("recommendations", {}),
        "error": result.get("error"),
    }