import httpx
import os
from typing import Any

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://localhost:5000",
)

async def calculate_promotions(
        customer_id: str,
        items: list[dict[str,Any]],
        coupon_code: str | None = None,
) -> dict[str, Any]:
    """
    Calculate cart promotions using the Express commerce backend

    Each item must contain:
        {"sku": "SHIRT001", "quantity": 1}

    The backend remains the source of truth for prices and discounts.
    """

    payload = {
        "customerId": customer_id,
        "items": items,
        "couponCode": coupon_code,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{BACKEND_URL}/api/promotions/apply",
            json=payload,
        )

        if response.is_error:
            try:
                error_data = response.json()
                error_message = error_data.get(
                    "error",
                    "Promotion calculation failed",
                )
            except ValueError:
                error_message = "Promotion calculation failed"

            raise ValueError(error_message)

        return response.json()