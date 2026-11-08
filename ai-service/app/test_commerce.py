import asyncio

from app.tools.commerce import (
    get_customer,
    get_recommendations,
)

async def main():
    customer = await get_customer("CUST001")

    print("Customer profile retrieved:")
    print(customer)

    recommendations = await get_recommendations(
        customer_id="CUST001",
        budget=5000,
        category="formalwear",
        location_id="STORE001",
    )

    print("\nRecommendations retrieved:")
    print(recommendations)

if __name__ == "__main__":
    asyncio.run(main())