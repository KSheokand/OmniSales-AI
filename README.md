# OmniSales AI

### AI-Powered Omnichannel Conversational Commerce Assistant

OmniSales AI is an AI-powered conversational shopping assistant designed to transform traditional online shopping into an intelligent, personalized, and interactive experience.

It combines Large Language Models (LLMs), AI agents, and commerce APIs to help customers discover products, receive personalized recommendations, explore complementary products, apply promotions, manage shopping carts, and complete simulated purchases through natural-language conversations.

> **Project Status:** Active Development — Core prototype implemented.

---

## 1. Overview

Traditional e-commerce platforms require customers to navigate multiple pages, filters, and product listings to find what they need.

OmniSales AI introduces a conversational approach to shopping.

Customers can express their requirements naturally, and an AI Sales Agent coordinates with backend commerce services to assist throughout the shopping journey.

### Core Design Philosophy

- **AI handles intelligence:** Natural-language understanding, customer interaction, intent recognition, and agent orchestration.
- **Backend handles business logic:** Product information, inventory validation, pricing, promotions, and order creation.
- **Database maintains commerce data:** Products, customers, inventory, and orders.

This separation ensures that business-critical operations are handled by deterministic backend services rather than relying entirely on LLM-generated responses.

---

## 2. Key Features

### A. Conversational AI Shopping Assistant

- Interactive chat-based shopping experience.
- Natural-language product discovery.
- Local LLM integration using Ollama.
- LangGraph-based Sales Agent orchestration.
- Recent conversation history passed between frontend and AI service.

### B. Intelligent Product Recommendations

- Product catalogue integrated with MongoDB.
- Product recommendations based on customer requirements.
- Inventory-aware product recommendations.
- Complementary product suggestions.
- Availability checks before suggesting complementary items.

### C. Smart Shopping Cart

- Add recommended products using natural-language commands.
- Update product quantities.
- Manage cart items.
- Calculate cart totals.
- Apply promotional discounts.

### D. Promotion and Discount Engine

The commerce backend supports:

| Promotion | Discount |
|---|---:|
| Platinum Loyalty | 8% |
| Gold Loyalty | 5% |
| Bundle Discount | 5% |
| STYLE10 Coupon | 10% |

**Promotion rules:**
- Loyalty discounts depend on customer tier.
- Bundle discount applies when at least two distinct SKUs are present.
- STYLE10 applies a 10% coupon discount.
- Total discounts are capped at the cart subtotal.

### E. Simulated Checkout

- Product and inventory validation.
- Order creation in MongoDB.
- Simulated payment processing.
- Order confirmation displayed in the frontend.

No real payment gateway or payment collection is currently implemented.

### F. Omnichannel Interface Demonstration

The frontend provides selectable channel modes:

- Web
- Kiosk
- Messaging

These currently demonstrate channel selection within the prototype. Live third-party integrations and shared cross-device customer sessions are planned future enhancements.

---

## 3. System Architecture

```text
                     CUSTOMER
                        |
                        v
              NEXT.JS FRONTEND
                        |
              Conversational UI
                        |
             Cart / Recommendations
                        |
                        v
                PYTHON FASTAPI
                  AI SERVICE
                        |
                        v
              LANGGRAPH SALES AGENT
                        |
                 OLLAMA LOCAL LLM
                        |
             +----------+----------+
             |          |          |
             v          v          v
        Promotion   Bundling   Recommendation
          Agent      Worker       Service
             |          |          |
             +----------+----------+
                        |
                        v
              EXPRESS COMMERCE API
                        |
                        v
                  MONGODB ATLAS
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
       Products     Customers     Inventory
                        |
                        v
                      Orders
```

### Architecture Principles

1. AI-driven conversational interaction.
2. Agent-based task orchestration.
3. Deterministic commerce operations.
4. Centralized product and inventory management.
5. Modular backend services.
6. Local LLM inference to avoid mandatory paid LLM API usage during development.

---

## 4. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| UI Library | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Commerce Backend | Node.js |
| Backend Framework | Express.js |
| AI Backend | Python |
| API Framework | FastAPI |
| Agent Orchestration | LangGraph |
| Language Model | Ollama |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Development Environment | Ubuntu |

---

## 5. Repository Structure

```text
OmniSalesAI/
│
├── ai-service/
│   └── app/
│       ├── agents/
│       │   ├── bundling_agent.py
│       │   └── promotion_agent.py
│       │
│       └── ...
│
├── backend/
│   └── src/
│       ├── models/
│       │   ├── Product.ts
│       │   ├── Customer.ts
│       │   ├── Inventory.ts
│       │   └── Order.ts
│       │
│       ├── routes/
│       │   ├── inventoryRoutes.ts
│       │   ├── checkoutRoutes.ts
│       │   └── ...
│       │
│       ├── services/
│       │   └── recommendationService.ts
│       │
│       ├── seed.ts
│       └── server.ts
│
├── frontend/
│   └── src/
│       ├── app/
│       └── lib/
│
├── docs/
│
└── README.md
```

---

## 6. Database Design

The current MongoDB database contains the following collections:

| Collection | Purpose |
|---|---|
| Products | Product catalogue and product attributes |
| Customers | Customer information and loyalty tiers |
| Inventory | Stock availability across locations |
| Orders | Simulated customer orders |

### Development Seed Data

The current development database contains:

- 30 products
- 10 customers
- 120 inventory records

Inventory locations include:

- STORE001
- STORE002
- STORE003
- WAREHOUSE001

These values represent development seed data, not production inventory.

---

## 7. Backend API Overview

The Express commerce backend currently implements the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/products` | Retrieve products |
| GET | `/api/products/:sku` | Retrieve product by SKU |
| GET | `/api/inventory/:sku` | Retrieve inventory across locations |
| GET | `/api/inventory/:sku/:locationId` | Retrieve location-specific inventory |
| GET | `/api/customers/:customerId` | Retrieve customer details |
| POST | `/api/promotions/apply` | Calculate applicable promotions |
| POST | `/api/recommendations` | Generate product recommendations |
| POST | `/api/checkout/simulate` | Execute simulated checkout |

The FastAPI service additionally exposes AI agent, chat, health, and complementary-product functionality.

Visit the FastAPI documentation at:

`http://localhost:8000/docs`

for the current AI service API specifications.

---

## 8. Installation and Setup

### Prerequisites

Install the following:

- Node.js
- npm
- Python 3
- MongoDB Atlas account
- Ollama
- Git

### Step 1: Clone the repository

```bash
git clone https://github.com/KSheokand/OmniSales-AI.git

cd OmniSalesAI
```

### Step 2: Configure Environment Variables

Configure the environment files required by:

- Frontend
- Commerce backend
- AI service

Add your MongoDB connection string and local service URLs as required by the application.

Never upload actual credentials, API keys, or secret environment variables to GitHub.

### Step 3: Start the Commerce Backend

```bash
cd backend

npm install

npm run dev
```

Backend URL:

`http://localhost:5000`

Health check:

`http://localhost:5000/api/health`

### Step 4: Start the AI Service

```bash
cd ai-service
```

Create and activate a Python virtual environment, install the dependencies listed by the project, and configure Ollama.

Start FastAPI using the entry point and command defined in the AI service.

AI service URL:

`http://localhost:8000`

Health check:

`http://localhost:8000/health`

API documentation:

`http://localhost:8000/docs`

### Step 5: Start the Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend URL:

`http://localhost:3000`

### Step 6: Production Build

To verify the frontend:

```bash
npm run build
```

The Next.js production build and TypeScript validation have successfully passed in the development environment.

---

## 9. Current Development Status

| Module | Status |
|---|---|
| Next.js frontend | Completed |
| Express commerce backend | Implemented |
| MongoDB Atlas integration | Working |
| Product catalogue APIs | Implemented |
| Customer APIs | Implemented |
| Inventory APIs | Implemented |
| Promotion engine | Implemented |
| Recommendation service | Implemented |
| FastAPI AI service | Working |
| Ollama integration | Working locally |
| LangGraph Sales Agent | Implemented |
| Complementary product agent | Implemented |
| Natural-language cart commands | Implemented |
| Simulated checkout | Implemented |
| Frontend production build | Passed |
| Atomic inventory management | Pending |
| Persistent conversation memory | Pending |
| Cross-channel session synchronization | Pending |
| Automated integration testing | Pending |
| Production deployment | Pending |

---

## 10. Known Limitations

The current application is a working prototype and is not yet production-ready.

1. Checkout currently validates inventory but does not atomically reserve or decrement stock.
2. Concurrent checkout protection still needs implementation.
3. Payment processing is simulated.
4. Web, kiosk, and messaging modes are demonstrations rather than live third-party integrations.
5. Persistent customer sessions and cross-device cart synchronization are not yet implemented.
6. Comprehensive automated testing remains pending.
7. Production deployment and monitoring remain pending.
8. Ollama must be available to the AI service, requiring suitable model hosting and compute resources for deployment.

---

## 11. Future Roadmap

### Phase 1: Commerce Reliability
- Atomic inventory deduction.
- MongoDB transaction-based checkout where supported.
- Checkout idempotency.
- Safe failure recovery.
- Server-side pricing and promotion validation.

### Phase 2: Customer Personalization
- Persistent conversation memory.
- Customer purchase history.
- Personalized recommendations.
- Order history and retrieval.
- Improved natural-language cart operations.

### Phase 3: Omnichannel Experience
- Persistent customer sessions.
- Shared shopping cart across channels.
- Kiosk interface simulation.
- Messaging interface simulation.
- Integration with external messaging platforms.

### Phase 4: Testing and Deployment
- Unit testing.
- Integration testing.
- End-to-end testing.
- Error handling and logging.
- Production deployment.
- Monitoring and performance optimization.

---

## 12. Project Vision

OmniSales AI aims to demonstrate how conversational AI and agentic workflows can transform traditional retail commerce into a more intelligent and personalized shopping experience.

By combining local LLM inference, LangGraph orchestration, and deterministic commerce APIs, the project explores a scalable architecture for AI-powered retail assistants.

**The goal is to move beyond traditional chatbots and build an AI Sales Agent that actively assists customers throughout their shopping journey.**

---

