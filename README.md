# 🗣️ Voice AI Workshop – ElevenLabs + MCP + Docker

Welcome to the **Voice Agent Workshop**!  
In this session, you'll connect a **voice-powered AI agent** (built with ElevenLabs) to a **local backend** that provides product and stock data — all running in Docker and exposed via Ngrok.

---

## 🧰 Pre-Workshop Setup

Before the session, make sure you have the following installed and configured:

| Tool | Purpose | Notes |
|------|----------|-------|
| **Docker Desktop** | Runs all workshop services (DB, backend, MCP, Ngrok) | [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) - Must be running before starting |
| **Git** | To clone the project repository | [Download Git](https://git-scm.com/downloads) |
| **Visual Studio Code** | Recommended IDE | [Download VS Code](https://code.visualstudio.com/) |
| **Ngrok Account** | Required to expose your local MCP to ElevenLabs | [Sign up here](https://ngrok.com/) |
| **Ngrok Authtoken** | Needed to authenticate your tunnel | Retrieve from your Ngrok dashboard |
| **ElevenLabs Account** | To build and test your AI voice agent | [Sign up here](https://elevenlabs.io) |

---

## 🚀 Getting Started

### **1️⃣ Clone the repository**

```bash
git clone https://github.com/luciadeoliveira-orangeloops/ol-boston-workshop.git
cd ol-boston-workshop
```

---

### **2️⃣ Create your environment file**

Duplicate the example:

#### macOS/Linux:
```bash
cp .env.example .env
```

#### Windows:
```powershell
copy .env.example .env
```

Then open `.env` and make sure the following variables exist:

```bash
POSTGRES_USER=workshop
POSTGRES_PASSWORD=workshop
POSTGRES_DB=store
POSTGRES_PORT=5432
PORT=4000

NGROK_AUTHTOKEN=your_ngrok_token_here
```

---

### **3️⃣ Verify your setup (optional but recommended)**

Before starting, you can run our verification script to check if all requirements are installed:

#### macOS/Linux:
```bash
./check-setup.sh
```

#### Windows (PowerShell):
```powershell
.\check-setup.ps1
```

The script will check:
- ✓ Docker Desktop installation and status
- ✓ Git installation
- ✓ VS Code installation (optional)
- ✓ `.env` file configuration
- ✓ Ngrok authtoken setup

Fix any issues before proceeding to the next step.

---

### **4️⃣ Start all services with Docker**

```bash
docker compose up --build
```

This will automatically start:
- 🗄️ PostgreSQL (with demo data)
- ⚙️ Backend API (`/api/products`, `/api/stock`)
- 🔌 MCP Server (`/categories`, `/attributes`, `/query-products`, `/query-stock`)
- 🌍 Ngrok tunnel (to expose the MCP)

Wait until you see:
```
✅ MCP listening on http://0.0.0.0:4000
🌐 Ngrok public URL: https://xxxxxx.ngrok-free.app
```
That URL is your **public endpoint** for ElevenLabs — copy it.

---

### **5️⃣ Verify that everything is running**

**Backend API:**

#### macOS/Linux:
```bash
# Get all products
curl "http://localhost:3001/api/products"

# Get blue hoodies
curl "http://localhost:3001/api/products?color=blue&category=hoodies"
```

#### Windows (PowerShell):
```powershell
# Get all products
Invoke-WebRequest -Uri "http://localhost:3001/api/products" | Select-Object -Expand Content

# Get blue hoodies
Invoke-WebRequest -Uri "http://localhost:3001/api/products?color=blue&category=hoodies" | Select-Object -Expand Content
```

#### Windows (CMD with curl):
```cmd
REM Get all products
curl "http://localhost:3001/api/products"

REM Get blue hoodies
curl "http://localhost:3001/api/products?color=blue&category=hoodies"
```

**MCP Server:**

#### macOS/Linux:
```bash
# Get all categories
curl "http://localhost:4000/categories"

# Query products with filters
curl "http://localhost:4000/query-products?color=blue&category=hoodies"
```

#### Windows (PowerShell):
```powershell
# Get all categories
Invoke-WebRequest -Uri "http://localhost:4000/categories" | Select-Object -Expand Content

# Query products with filters
Invoke-WebRequest -Uri "http://localhost:4000/query-products?color=blue&category=hoodies" | Select-Object -Expand Content
```

#### Windows (CMD with curl):
```cmd
REM Get all categories
curl "http://localhost:4000/categories"

REM Query products with filters
curl "http://localhost:4000/query-products?color=blue&category=hoodies"
```

You should receive JSON responses from all endpoints.

---

### **6️⃣ Create your ElevenLabs Agent**

1. Go to [ElevenLabs Voice Agents](https://elevenlabs.io/voice-lab/agents)  
2. Click **“Create Agent”**

| Field | Value |
|--------|--------|
| **Name** | `Voice Workshop Agent` |
| **Description** | Voice AI that helps users find products and check stock |
| **Language** | English |
| **Voice** | Any |
| **Execution Mode** | Immediate |
| **Interruptions** | Disabled |

---

### **7️⃣ Add the MCP Tools (Webhooks)**

| Name | URL | Method |
|------|------|--------|
| **get_categories** | `https://YOUR_NGROK_URL/categories` | GET |
| **get_attributes** | `https://YOUR_NGROK_URL/attributes` | GET |
| **catalog_product_search** | `https://YOUR_NGROK_URL/query-products` | GET |
| **inventory_stock_lookup** | `https://YOUR_NGROK_URL/query-stock` | GET |

---

### **8️⃣ Upload Knowledge Documents (RAG)**

To give your agent company-specific context:

1. In ElevenLabs, open your agent → **Knowledge Base**
2. Upload documents like:
   - Return & exchange policies  
   - Delivery and warranty info  
   - FAQs  

ElevenLabs will automatically perform **Retrieval-Augmented Generation (RAG)** when answering related questions.

---

### **9️⃣ Test Your Agent**

Try questions like:
> “Do you have blue hoodies in size M?”  
> “What’s your return policy?”  
> “Show me jeans under 50 dollars.”

---

### **🔟 Run the Frontend**

This will open a simple store interface with:
- Product listings  
- Category filters  
- Embedded ElevenLabs voice widget  

---

## 🧠 By the End of This Workshop You’ll Have:

- A working **voice-enabled AI agent**  
- Connected **MCP tools** bridging ElevenLabs and your backend  
- Optional **RAG-powered knowledge base**  
- A ready-to-extend base for new integrations (WhatsApp, LangGraph, etc.)

---

### 🧩 Next Steps

- Integrate the same agent with **WhatsApp** via Twilio or Meta API  
- Use **LangGraph** for deeper reasoning and RAG orchestration  
- Expand the **Knowledge Base** with more company documents  

---

Made with 🧡 by OrangeLoops R&D Studio
