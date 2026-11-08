import asyncio
import json

from app.agents.promotion_agent import calculate_promotions


async def main():
    print("Testing promotion worker...\n")

    # Test 1: Bundle promotion
    bundle_result = await calculate_promotions(
        customer_id="CUST001",
        items=[
            {"sku": "SHIRT001", "quantity": 1},
            {"sku": "TROUSER001", "quantity": 1},
        ],
    )

    print("BUNDLE PROMOTION RESULT")
    print(json.dumps(bundle_result, indent=2))

    assert bundle_result["subtotal"] > 0
    assert bundle_result["finalTotal"] == (
        bundle_result["subtotal"] - bundle_result["totalDiscount"]
    )
    assert bundle_result["discounts"]["bundle"] > 0

    print("\nBundle promotion test passed.")

    # Test 2: Coupon promotion
    coupon_result = await calculate_promotions(
        customer_id="CUST001",
        items=[
            {"sku": "SHIRT001", "quantity": 1},
        ],
        coupon_code="STYLE10",
    )

    print("\nCOUPON PROMOTION RESULT")
    print(json.dumps(coupon_result, indent=2))

    assert coupon_result["discounts"]["coupon"] > 0
    print("\nCoupon promotion test passed.")


if __name__ == "__main__":
    asyncio.run(main())