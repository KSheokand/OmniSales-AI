from app.tools.commerce import get_product, get_inventory

async def get_complementary_products(
        sku: str,
        location_id: str = "STORE001",
) -> dict:
    """
    Find complementary products and check their availability.
    
    Uses the complementarySkus configured in the product catalog.
    """

    product = await get_product(sku)

    if isinstance(product.get("product"), dict):
        product = product["product"]

    complementary_skus = product.get("complementarySkus", [])

    results = []

    for complementary_sku in complementary_skus[:5]:
        try:
            complementary_product = await get_product(complementary_sku)

            if isinstance(complementary_product.get("product"), dict):
                complementary_product = complementary_product["product"]

            inventory = await get_inventory(
                complementary_sku,
                location_id,
            )

            if isinstance(inventory, list):
                records = inventory
            else:
                records = inventory.get(
                    "inventory",
                    inventory.get("data",[]),
                )

            if isinstance(records, dict):
                records = [records]

            available_quantity = 0

            for record in records:
                available_quantity += max(
                    0,
                    record.get(
                        "availableQuantity",
                        record.get("stockAvailable",0)-record.get("reservedQuantity",0)
                    ),
                )

            results.append(
                {
                    "sku": complementary_sku,
                    "name": complementary_product.get("name"),
                    "price": complementary_product.get("price"),
                    "category": complementary_product.get("category"),
                    "availableQuantity": available_quantity,
                    "available": available_quantity > 0,
                }
            )

        except Exception as exc:
            results.append({
                "sku": complementary_sku,
                "available": False,
                "error": str(exc),
            })

    return {
        "baseProduct": {
            "sku": product.get("sku", sku),
            "name": product.get("name"),
        },
        "locationId": location_id,
        "complementaryProducts": results,
    }