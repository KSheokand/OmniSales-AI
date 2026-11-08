import asyncio

from app.agents.bundling_agent import get_complementary_products

async def main():
    result = await get_complementary_products(
        sku="SHIRT001",
        location_id="STORE001",
    )

    print("Complementary product results:")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())