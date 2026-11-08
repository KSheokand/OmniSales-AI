"use client";

import { FormEvent, useState } from "react";
import {
  ChatResponse,
  RecommendedProduct,
  CartItem,
  PromotionResult,
  CheckoutResult,
  sendChatMessage,
  calculateCartPromotions,
  simulateCheckout,
  getComplementaryProducts,
  ComplementaryProduct,
} from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "Find me a formal outfit under ₹5,000",
  "Show me black clothing for the office",
  "Recommend something for a party",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your personal shopping assistant. Tell me what you're looking for, and I'll help you find products that fit your style and budget.",
    },
  ]);

  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [budget, setBudget] = useState("5000");
  const [category, setCategory] = useState("formalwear");
  const [color, setColor] = useState("Any color");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [pricing, setPricing] = useState<PromotionResult | null>(null);
  const [cartError, setCartError] = useState("");
  const [cartLoading, setCartLoading] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<CheckoutResult | null>(null);

  const [pendingBundle, setPendingBundle] = useState<ComplementaryProduct[]>([]);

  const [channel, setChannel] = useState<
    "web" | "kiosk" | "messaging"
  >("web");

  function handleShoppingAction(message: string): string | null {
    const text = message.toLowerCase().trim();

    if (
      /add the first (recommendation|product|one) to (my )?cart/.test(text)
    ) {
      const product = products[0];

      if(!product) {
        return "I don't have any recommendations to add yet. Ask me to find products first."
      }

      addToCart(product);
      return `Added ${product.name} (${product.sku}) to your cart`;
    }

    const skuMatch = message.match(
      /\b([A-Z]{2,}\d{3,})\b/i
    );

    if(
      skuMatch &&
      /\b(add|put)\b/i.test(text) &&
      /\b(cart|bag)\b/i.test(text)
    ) {
      const sku = skuMatch[1].toUpperCase();
      const product = products.find(
        (item) => item.sku.toUpperCase() === sku
      );

      if(!product) {
        return `I couldn't find ${sku} in the current recommendations. Ask me to find that product first.`;
      }

      addToCart(product);
      return `Added ${product.name} (${product.sku}) to your cart.`;
    }

    if (
      /increase (the )?quantity|add another one|make (it|that) two/.test(text)
    ) {
      if(cart.length === 0){
        return "Your cart is empty. Add a product first";
      }

      const firstItem = cart[0];
      updateQuantity(firstItem.sku, firstItem.quantity + 1);

      return `Updated${firstItem.name} to quantity ${Math.min(
        20, firstItem.quantity + 1
      )}.`;
    }

    const couponMatch = message.match(/\b(STYLE10)\b/i);

    if (
      couponMatch && 
      /\b(apply|use|enter)\b/i.test(text)
    ) {
      if (cart.length === 0) {
        return "Your cart is empty. Add products before applying a coupon."
      }

      const coupon = couponMatch[1].toUpperCase();
      setCouponCode(coupon);

      void refreshCartPricing(coupon);

      return `Applying ${coupon} to your cart. It'll retrieve the actual discount from the commerce backend.`;
    }

    if(
      /what('?s| is) my (final )?total|show (me )?(my )?(cart|total)|cart total/.test(text)
    ) {
      if(cart.length === 0) {
        return "Your cart is empty. Ask me to find products first.";
      }

      if(pricing) {
        return `Your current calculated total is ₹${pricing.finalTotal.toLocaleString(
          "en-IN"
        )}, after ₹${pricing.totalDiscount.toLocaleString(
          "en-IN"
        )} in discounts.`;
      }

      return "I'll calculate your cart total using the commerce backend. Please use the Apply button in the order summary, or ask me to apply STYLE10 if you'd like to use that coupon.";
    }

    return null;
  }

  async function handleComplementaryAction(
    message: string
  ): Promise<string | null> {
    const text = message.toLowerCase().trim();

    if (
    /^(yes|yes please|add it|add them|confirm|go ahead|sure|do it)[.! ]*$/.test(text)
    ) {
      const selected = pendingBundle.find(
        (item) => item.available && item.price !== undefined
      );

      if(!selected) {
        return null;
      }

      const cartProduct: RecommendedProduct = {
        sku: selected.sku,
        name: selected.name ?? selected.sku,
        category: selected.category ?? "other",
        price: selected.price!,
        color: "Not specified",
        availableQuantity: selected.availableQuantity ?? 0,
        reasons: ["Complementary product"],
      };

      addToCart(cartProduct);
      setPendingBundle([]);

      return `Added ${cartProduct.name} (${cartProduct.sku}) to your cart for ₹${cartProduct.price.toLocaleString("en-IN")}. Your cart has been updated.`;
    }

    if(/^(no|no thanks|cancel|not now)[.! ]*$/.test(text)) {
      if(pendingBundle.length > 0) {
        setPendingBundle([]);
        return "No problem. I haven't added the suggested complementary product.";
      }
    }

    if (
      /\b(add|find|suggest|show|recommend)\b/.test(text) &&
      /\b(matching|complementary|trousers|pants|shoes|matching items)\b/.test(text)
    ) {
      const baseProduct = 
        cart.length > 0
          ? cart[0]
          : products.length > 0
            ? products[0]
            : null;

      if(!baseProduct) {
        return "First, ask me to find a product or add one to your cart. Then I can look for matching items.";
      }

      try {
        const result = await getComplementaryProducts(
          baseProduct.sku,
          "STORE001"
        );

        const candidates = result.complementaryProducts.filter(
          (item) =>
            item.available === true &&
          typeof item.price === "number" &&
          (item.availableQuantity ?? 0) > 0
        );

        if(candidates.length === 0) {
          return `I couldn't find any available complementary products for ${baseProduct.name} at STORE001.`;
        }

        const preferred = candidates.find((item) => {
          const description =
            `${item.name ?? ""} ${item.category ?? ""}`.toLowerCase();

            if (/\b(trousers|pants)\b/.test(text)) {
              return /\b(trousers|pants)\b/.test(description);
            }

            if (/\bshoes\b/.test(text)) {
              return /\b(shoes|footwear)\b/.test(description);
            }

            return true;
          });

          const selected = preferred ?? candidates[0];

          if (
            /\b(trousers|pants|shoes)\b/.test(text) &&
            !preferred
          ) {
            return `I found complementary products for ${baseProduct.name}, but none clearly matched your requested item. Available options: ${candidates
              .map((item) => `${item.name ?? item.sku} (${item.sku})`)
              .join(", ")}. Which would you like to consider?`;
            }

            setPendingBundle([selected]);

            return `I found ${selected.name ?? selected.sku} (${selected.sku}) at STORE001 for ₹${selected.price!.toLocaleString("en-IN")}. There are ${selected.availableQuantity} available. Would you like me to add it to your cart?`;
          } catch (err) {
            return err instanceof Error
              ? `I couldn't retrieve matching products: ${err.message}`
              : "I couldn't retrieve matching products. Please try again.";
          }
    }

    return null;    
  }

  async function handleSubmit(
    event?: FormEvent<HTMLFormElement>,
    suggestedMessage?: string
  ) {
    event?.preventDefault();

    const message = (suggestedMessage ?? input).trim();

    if (!message || loading) return;

    const bundleResponse = await handleComplementaryAction(message);

    if(bundleResponse !== null) {
      setMessages((previous) => [
        ...previous,
        { role: "user", content: message},
        { role: "assistant", content: bundleResponse},
      ]);

      setInput("");
      return;
    }

    const actionResponse = handleShoppingAction(message);

    if(actionResponse !== null) {
      setMessages((previous) => [
        ...previous,
        { role: "user", content: message},
        { role: "assistant", content: actionResponse},
      ]);

      setInput("");
      return;
    }

    setMessages((previous) => [
      ...previous,
      { role: "user", content: message },
    ]);

    setInput("");
    setLoading(true);
    setError("");

    try {
      const history = messages.slice(-10).map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const result: ChatResponse = await sendChatMessage({
        message,
        customer_id: "CUST001",
        location_id: "STORE001",
        history,
        channel,
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            result.response ??
            result.error ??
            "I couldn't generate a response. Please try again.",
        },
      ]);

      setProducts(result.recommendations?.recommendations ?? []);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to connect to the AI service.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function applyPreferences() {
    const parts = [
      `Find products under ₹${budget}`,
      category === "formalwear"
        ? "for a formal occasion"
        : category === "casualwear"
          ? "for casual wear"
          : "for outerwear",
    ];

    if (color !== "Any color") {
      parts.push(`in ${color.toLowerCase()}`);
    }

    void handleSubmit(undefined, parts.join(" "));
  }

  function addToCart(product: RecommendedProduct) {
    setCart((previous) => {
      const existing = previous.find((item) => item.sku === product.sku);

      if(existing){
        return previous.map((item) => 
          item.sku === product.sku
            ? {...item, quantity: Math.min(20, item.quantity + 1) }
            : item
          );
      }

      return [
        ...previous,
        {
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });

    setPricing(null);
    setAppliedCoupon("");
    setOrderConfirmation(null);
    setCartError("");
  }

  function updateQuantity(sku: string, quantity: number) {
    if(quantity < 1){
      setCart((previous) => previous.filter((item) => item.sku !== sku));
    } else {
      setCart((previous) =>
        previous.map((item) =>
          item.sku === sku
            ? { ...item, quantity: Math.min(20, quantity) }
            : item
        )
      );
    }

    setPricing(null);
    setAppliedCoupon("");
    setOrderConfirmation(null);
    setCartError("");
  }

  async function refreshCartPricing(coupon = couponCode) {
    if(cart.length === 0) {
      setCartError("Add at least one product to your cart.");
      return;
    }

    setCartLoading(true);
    setCartError("");
    setOrderConfirmation(null);

    try {
      const result = await calculateCartPromotions(
        "CUST001",
        cart.map(({ sku, quantity}) => ({ sku, quantity })),
        coupon.trim() || undefined
      );

      setPricing(result);
      setAppliedCoupon(result.appliedCoupon ?? "");
    } catch (err) {
      setPricing(null);
      setAppliedCoupon("");

      setCartError(
        err instanceof Error ? err.message : "Unable to calculate cart pricing."
      );
    } finally {
      setCartLoading(false);
    }
  }

  async function handleCheckout() {
    if(cart.length === 0){
      setCartError("Your cart is empty")
      return;
    }

    setCartLoading(true);
    setCartError("");
    setOrderConfirmation(null);

    try {
      const result = await simulateCheckout(
        "CUST001",
        "STORE001",
        cart.map(({ sku, quantity }) => ({ sku, quantity})),
        appliedCoupon || undefined
      );

      setOrderConfirmation(result);
      setPricing(null);
      setCart([]);
      setCouponCode("");
      setAppliedCoupon("");
    } catch (err) {
      setCartError(
        err instanceof Error ? err.message: "Checkout failed. Please try again."
      );
    } finally {
      setCartLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#20231f] md:flex">
      {/* Sidebar */}
      <aside className="flex w-full flex-col bg-[#18231e] p-5 text-white md:min-h-screen md:w-72 md:shrink-0 md:p-6">
        <div className="mb-9 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d9f36a] text-xl font-black text-[#18231e]">
            O
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              OmniSales
            </h1>
            <p className="text-xs text-white/55">AI Shopping Assistant</p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                role: "assistant",
                content:
                  "Hey! I'm your personal shopping assistant. What are we looking for today?",
              },
            ]);
            setProducts([]);
            setError("");
            setInput("");
            setPendingBundle([]);
            setPricing(null);
            setCartError("");
            setOrderConfirmation(null);
          }}
          className="mb-8 rounded-xl border border-white/15 px-4 py-3 text-left text-sm transition hover:bg-white/10"
        >
          <span className="mr-2">＋</span>
          New conversation
        </button>

        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          Your shopping profile
        </div>

        <div className="space-y-4 rounded-2xl bg-white/6 p-4">
          <div>
            <p className="text-xs text-white/50">Customer</p>
            <p className="mt-1 font-medium">Aarav · CUST001</p>
          </div>

          <div>
            <p className="text-xs text-white/50">Preferred store</p>
            <p className="mt-1 font-medium">STORE001</p>
          </div>

          <div>
            <p className="text-xs text-white/50">Shopping mode</p>
            <p className="mt-1 font-medium">Personalized discovery</p>
          </div>
        </div>

        <div className="mt-8 mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          Try asking
        </div>

        <div className="space-y-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void handleSubmit(undefined, prompt)}
              disabled={loading}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-white/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-[#d9f36a]" />
            Local AI enabled
          </div>
          <p className="mt-1 text-xs leading-5 text-white/50">
            Powered by Ollama, LangGraph and your commerce backend.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <section className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-black/5 bg-white/80 px-5 py-4 backdrop-blur md:px-9">
          <div>
            <p className="text-xs text-gray-500">YOUR PERSONAL STYLIST</p>
            <h2 className="mt-1 text-lg font-semibold">
              Shopping assistant
            </h2>
          </div>

          <div className="rounded-full border border-[#dce4d6] bg-[#edf4e7] px-3 py-1.5 text-xs font-medium text-[#40583b]">
            ● AI online
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">
          {/* Welcome banner */}
          <div className="overflow-hidden rounded-3xl bg-[#e8eddf] p-6 md:p-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#65734e]">
                DISCOVER YOUR STYLE
              </p>

              <h3 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Shopping that gets you.
              </h3>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#59614f] md:text-base">
                Tell me what you need. I&apos;ll find matching products using
                your preferences, budget and store availability.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            
            {/* Chat panel */}
            <section className="flex min-h-120 min-w-0 flex-col rounded-3xl border border-black/5 bg-white p-4 shadow-sm md:p-6">
              
              <div className="mb-5 flex items-center justify-between border-b border-black/5 pb-4">
                <div>
                  <h3 className="font-semibold">Your conversation</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Personalized product discovery
                  </p>
                </div>
                <span className="text-xl">✳</span>
              </div>

              <div className="flex flex-wrap gap-2">
  {(
    [
      ["web", "🌐 Web Chat"],
      ["kiosk", "🖥️ Store Kiosk"],
      ["messaging", "💬 Messaging"],
    ] as const
  ).map(([value, label]) => (
    <button
      key={value}
      onClick={() => setChannel(value)}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        channel === value
          ? "bg-[#18231e] text-white"
          : "border border-black/10 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  ))}
</div>

              <div className=" mt-4 flex-1 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={`${index}-${message.role}`}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role === "user"
                          ? "rounded-br-md bg-[#18231e] text-white"
                          : "rounded-bl-md bg-[#f1f2ed] text-[#343a31]"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="rounded-2xl bg-[#f1f2ed] px-4 py-3 text-sm text-gray-600">
                    Finding the right products…
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                    <p className="mt-1 text-xs">
                      Check that FastAPI, Ollama and the commerce backend are
                      running.
                    </p>
                  </div>
                )}
              </div>

              <form
                onSubmit={(event) => void handleSubmit(event)}
                className="mt-6 flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 focus-within:border-[#82936d]"
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Describe what you're looking for…"
                  aria-label="Shopping message"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                />

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-[#d9f36a] px-4 py-3 text-sm font-semibold text-[#18231e] transition hover:bg-[#cbe85a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send ↗
                </button>
              </form>

              <p className="mt-3 text-center text-[11px] text-gray-400">
                AI suggestions may need verification. Prices and stock should
                be confirmed before purchase.
              </p>
            </section>

            {/* Preferences panel */}
            <aside className="h-fit rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                PERSONALIZE
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Shopping preferences
              </h3>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Maximum budget (₹)
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm outline-none focus:border-[#82936d]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Category
                  </span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm outline-none focus:border-[#82936d]"
                  >
                    <option value="formalwear">Formalwear</option>
                    <option value="casualwear">Casualwear</option>
                    <option value="outerwear">Outerwear</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Preferred color
                  </span>
                  <select
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm outline-none focus:border-[#82936d]"
                  >
                    <option>Any color</option>
                    <option>Black</option>
                    <option>Navy</option>
                    <option>White</option>
                    <option>Blue</option>
                    <option>Grey</option>
                  </select>
                </label>

                <button
                  onClick={applyPreferences}
                  disabled={loading || !budget || Number(budget) < 0}
                  className="w-full rounded-xl bg-[#18231e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a3a31] disabled:opacity-50"
                >
                  Find my products →
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-[#f5f6f1] p-4">
                <p className="text-sm font-medium">Smart recommendations</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Results are generated through your commerce backend and its
                  available product data.
                </p>
              </div>
            </aside>
          </div>

          {/* Product recommendations */}
          {products.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#65734e]">
                    CURATED FOR YOU
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold">
                    Recommended products
                  </h3>
                </div>

                <span className="text-sm text-gray-500">
                  {products.length} found
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <article
                    key={product.sku}
                    className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex h-32 items-center justify-center rounded-xl bg-[#f0f1eb]">
                      <span className="text-5xl" aria-hidden="true">
                        {product.category?.toLowerCase().includes("shoe")
                          ? "👞"
                          : product.category?.toLowerCase().includes("outer")
                            ? "🧥"
                            : product.category?.toLowerCase().includes("trouser")
                              ? "👖"
                              : "👔"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="mt-1 text-xs text-gray-500">
                          SKU: {product.sku}
                        </p>
                      </div>

                      <span className="shrink-0 text-base font-bold">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        {product.color}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          product.availableQuantity > 0
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {product.availableQuantity > 0
                          ? `${product.availableQuantity} available`
                          : "Out of stock"}
                      </span>
                    </div>

                    {product.reasons && product.reasons.length > 0 && (
                      <p className="mt-4 text-xs leading-5 text-gray-500">
                        {product.reasons.slice(0, 2).join(" · ")}
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        className="rounded-xl bg-[#18231e] px-3 py-3 text-sm font-semibold text-white transition hover:bg-[#2a3a31]"
                      >
                        Add to cart
                      </button>

                      <button 
                        onClick={() =>
                          setInput(`Tell me more about ${product.name} (${product.sku})`)
                        }
                        className="rounded-xl border border-black/10 px-3 py-3 text-sm font-medium transition hover:bg-[#f5f6f1]"
                        >
                          Ask about product
                        </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Shopping cart*/}
          <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#65734e]">
                  YOUR SHOPPING BAG
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Your cart</h3>
              </div>

              <span className="rounded-full bg-[#f1f2ed] px-3 py-2 text-sm">
                {cart.reduce((total, item) => total + item.quantity, 0)} items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-[#f7f7f5] p-8 text-center">
                <div className="text-4xl">🛍️</div>
                <p className="mt-3 font-medium">Your cart is waiting for you</p>
                <p className="mt-1 text-sm text-gray-500">
                  Add products from your recommendations to build an outfit.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.sku}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.sku}
                          </p>
                          <p className="mt-2 font-medium">
                            ₹{item.price.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            aria-label={`Decrease quantity of ${item.name}`}
                            onClick={() =>
                              updateQuantity(item.sku, item.quantity - 1)
                            }
                            className="h-9 w-9 rounded-lg border border-black/10"
                          >
                            −
                          </button>

                          <span className="w-5 text-center text-sm">
                            {item.quantity}
                          </span>

                          <button
                            aria-label={`Increase quantity of ${item.name}`}
                            disabled={item.quantity >= 20}
                            onClick={() =>
                              updateQuantity(item.sku, item.quantity + 1)
                            }
                            className="h-9 w-9 rounded-lg border border-black/10 disabled:opacity-40"
                          >
                            +
                          </button>

                          <button
                            onClick={() => updateQuantity(item.sku, 0)}
                            className="ml-1 text-xs font-medium text-red-600"
                            >
                              Remove
                            </button>
                        </div>
                      </div>
                  ))}
                </div>

                <aside className="h-fit rounded-2xl bg-[#f7f7f5] p-5">
                  <h4 className="font-semibold">Order summary</h4>

                  <label className="mt-2 flex gap-2">
                    Coupon Code
                  </label>

                  <div className="mt-2 flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="Try STYLE10"
                      className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-3 text-sm outline-none focus:border-[#82936d]"
                    />

                    <button
                      disabled={cartLoading}
                      onClick={() => void refreshCartPricing()}
                      className="rounded-xl bg-[#18231e] px-3 py-3 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Apply
                      </button>
                  </div>

                  <button
                    disabled={cartLoading}
                    onClick={() => void refreshCartPricing("")}
                    className="mt-2 text-xs text-gray-500 underline"
                    >
                      Calculate without coupon
                    </button>

                    {pricing && (
                      <div className="mt-5 space-y-3 border-t border-black/10 pt-4 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">Subtotal</span>
                          <span>₹{pricing.subtotal.toLocaleString("en-IN")}</span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">Loyalty discount</span>
                          <span className="text-gray-700">
                            −₹{pricing.discounts.loyalty.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">Bundle discount</span>
                          <span className="text-green-700">
                            −₹{pricing.discounts.bundle.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">Coupon discount</span>
                          <span className="text-green-700">
                            −₹{pricing.discounts.coupon.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3 border-t border-black/10 pt-3 font-semibold">
                          <span>Total discount</span>
                          <span className="text-green-700">
                            −₹{pricing.totalDiscount.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3 text-base font-bold">
                          <span>Final total</span>
                          <span>₹{pricing.finalTotal.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    )}

                    {!pricing && (
                      <p className="mt-4 text-xs leading-5 text-gray-500">
                        Apply a coupon or calculate pricing to retrieve the actual discounts from the commerce backend.
                      </p>
                    )}

                    {cartError && (
                      <p
                        role="alert"
                        className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                      >
                        {cartError}
                      </p>
                    )}

                    <button
                      disabled={cartLoading || cart.length === 0}
                      onClick={() => void handleCheckout()}
                      className="mt-5 w-full rounded-xl bg-[#d9f36a] px-4 py-3 font-semibold text-[#18231e] transition hover:bg-[#cbe85a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cartLoading ? "Processing..." : "Confirm demo order →"}
                      </button>

                      <p className="mt-3 text-center text-xs leading-5 text-gray-500">
                        Demo checkout only. No real payment will be collected.
                      </p>
                </aside>
              </div>
            )}

            {orderConfirmation && (
              <div
                role="status"
                className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✓</span>
                  </div>
                    <h4 className="font-semibold text-green-900">
                      Demo order confirmed!
                    </h4>

                    <p className="mt-1 text-sm text-green-800">
                      Order ID: {orderConfirmation.order.orderId}
                    </p>

                    <p className="mt-2 text-sm text-green-800">
                      Total: ₹
                      {orderConfirmation.order.finalTotal.toLocaleString("en-IN")}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-green-800">
                      {orderConfirmation.notice}
                    </p>
                </div>
            )}
          </section>
        </div>

        <footer className="border-t border-black/5 px-5 py-4 text-center text-xs text-gray-400">
          OmniSales AI · Built with Next.js, LangGraph, Ollama and MongoDB
        </footer>
      </section>
    </main>
  );
}