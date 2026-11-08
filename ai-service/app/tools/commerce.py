import os
import httpx

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://localhost:5000",
)

async def get_customer(customer_id: str) -> dict:
    """Retrieve a customer's profile"""

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{BACKEND_URL}/api/customers/{customer_id}"
        )
        response.raise_for_status()
        return response.json()

async def get_recommendations(
        customer_id: str,
        budget: float,
        category: str | None = None,
        location_id: str | None = None,
        colors: list[str] | None = None,
        occasion: str | None = None,
) -> dict:
    """Retrieve product recommendations from the commerce backend"""

    payload = {
        "customerId": customer_id,
        "budget": budget,
        "category": category,
        "locationId": location_id,
        "colors": colors or [],
        "occasion": occasion,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            f"{BACKEND_URL}/api/recommendations",
            json=payload,
        )
        response.raise_for_status()
        return response.json()

async def get_inventory(
        sku: str,
        location_id: str | None = None,
) -> dict:
    """Retrieve inventory for a product across locations or at one location"""

    endpoint = f"{BACKEND_URL}/api/inventory/{sku}"

    if location_id:
        endpoint+=f"/{location_id}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(endpoint)
            response.raise_for_status()
            return response.json()

async def get_product(sku: str) -> dict:
    """Retrieve a product and its complementary SKUs"""

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{BACKEND_URL}/api/products/{sku}"
        )
        response.raise_for_status()
        return response.json()