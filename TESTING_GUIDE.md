# 🧪 Testing del Voice Agent con LangGraph

## Paso 1: Verificar que todos los servicios estén listos

### 1.1 Verificar estructura de archivos
```bash
cd /Users/luciaoliveira/Documents/workshop
ls -la voice-agent/
```
✅ Deberías ver: `src/`, `package.json`, `tsconfig.json`, `.env.example`

### 1.2 Instalar dependencias del voice agent
```bash
cd voice-agent
npm install
```
✅ Esperar que se instalen todas las dependencias sin errores

---

## Paso 2: Iniciar servicios en orden

### 2.1 Terminal 1 - Backend (si no está corriendo)
```bash
cd backend
npm run dev
```
✅ Deberías ver: `✅ Backend listening on http://0.0.0.0:3001`

### 2.2 Terminal 2 - MCP Server (si no está corriendo)
```bash
cd mcp
npm run dev
```
✅ Deberías ver: `✅ MCP listening on http://0.0.0.0:4000`

### 2.3 Terminal 3 - Voice Agent (NUEVO)
```bash
cd voice-agent
npm run dev
```
✅ Deberías ver:
```
🔄 Initializing MCP client...
✅ MCP client initialized
✅ Voice Agent API listening on http://0.0.0.0:5000

📋 Available endpoints:
   POST /voice - Process voice input (multipart/form-data)
   POST /text  - Process text input (JSON)
   GET  /health - Health check
```

### 2.4 Terminal 4 - Frontend
```bash
cd retail-catalog
npm run dev
```
✅ Deberías ver: `Ready on http://localhost:3000`

---

## Paso 3: Test de Health Checks

### 3.1 Backend Health
```bash
curl http://localhost:3001/health
```
✅ Respuesta esperada: `{"status":"ok","service":"backend"}`

### 3.2 MCP Health
```bash
curl http://localhost:4000/health
```
✅ Respuesta esperada: `{"status":"ok","service":"mcp"}`

### 3.3 Voice Agent Health
```bash
curl http://localhost:5000/health
```
✅ Respuesta esperada: `{"status":"ok"}`

---

## Paso 4: Test del Voice Agent con Texto (sin audio)

### 4.1 Test básico - Saludo
```bash
curl -X POST http://localhost:5000/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello"}'
```
✅ Deberías ver:
- `"intent": "general"`
- `"responseText"` con un saludo
- `"audioResponse"` con audio en base64

### 4.2 Test - Búsqueda de productos
```bash
curl -X POST http://localhost:5000/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Show me blue handbags"}'
```
✅ Deberías ver:
- `"intent": "product_search"`
- `"transcribedText": "Show me blue handbags"`
- `"responseText"` con productos encontrados
- Debería mencionar productos azules

### 4.3 Test - Consulta de política
```bash
curl -X POST http://localhost:5000/text \
  -H "Content-Type: application/json" \
  -d '{"text": "What is your return policy?"}'
```
✅ Deberías ver:
- `"intent": "policy"`
- `"responseText"` con información de la política de devoluciones

### 4.4 Test - Consulta de stock (necesitas un productId real)
Primero, obtén un producto real:
```bash
curl http://localhost:3001/api/products?limit=1
```
Copia el `id` del producto y úsalo:
```bash
curl -X POST http://localhost:5000/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Do you have product 15970 in stock?"}'
```
✅ Deberías ver:
- `"intent": "stock"`
- Información sobre disponibilidad del producto

---

## Paso 5: Test del Frontend

### 5.1 Abrir la aplicación
Abre en tu navegador: http://localhost:3000

✅ Deberías ver el widget del voice agent en la esquina inferior derecha

### 5.2 Verificar el componente
- Debe aparecer una tarjeta con:
  - Título: "LangGraph Voice Agent"
  - Botón de micrófono (redondo)
  - Texto: "Click the microphone to start"

### 5.3 Página dedicada
Abre: http://localhost:3000/voice-agent

✅ Deberías ver:
- Título: "Voice Agent Demo"
- El widget centrado
- Lista de ejemplos de consultas

---

## Paso 6: Test con Audio (Navegador)

### 6.1 Dar permisos de micrófono
1. Click en el botón de micrófono
2. El navegador pedirá permisos → **Permitir**
3. El botón debería cambiar a rojo y parpadear

### 6.2 Hablar una consulta
1. Di claramente: "Show me blue handbags"
2. Click en el botón nuevamente para detener
3. Deberías ver: "🔄 Processing your request..."

### 6.3 Verificar respuesta
✅ Deberías ver:
- **"You said:"** con tu transcripción
- **"Assistant:"** con la respuesta en texto
- El audio debería reproducirse automáticamente

### 6.4 Más pruebas de voz
Intenta:
- "What's your return policy?"
- "Find me summer dresses"
- "Hello, can you help me?"

---

## Paso 7: Verificar Logs

### 7.1 Logs del Voice Agent (Terminal 3)
Deberías ver algo como:
```
📨 [API] Received text request
🏥 [Health Check] Checking services...
🏥 [Health Check] Status: { backend: true, mcp: true, elevenlabs: true }
🧠 [Intent Detection] Analyzing intent...
🧠 [Intent Detection] Intent: product_search (confidence: 0.95)
🔧 [MCP Call] Calling query_products with params: ...
🔊 [Text-to-Speech] Converting text to speech...
✅ [API] Request processed successfully
```

---

## Paso 8: Debugging (si algo falla)

### 8.1 Si el voice agent no inicia
```bash
cd voice-agent
cat package.json  # Verificar que existe
npm install       # Re-instalar dependencias
npm run dev       # Intentar de nuevo
```

### 8.2 Si hay error de MCP
```bash
# Verificar que MCP está corriendo
curl http://localhost:4000/health

# Ver logs del MCP
# (En la terminal donde corre el MCP)
```

### 8.3 Si ElevenLabs da error
Verificar que la API key está configurada:
```bash
grep ELEVENLABS_API_KEY .env
```

### 8.4 Si OpenAI da error
Verificar que la API key está configurada:
```bash
grep OPENAI_API_KEY .env
```

### 8.5 Debug mode
Agregar `?debug=true` a la petición:
```bash
curl -X POST "http://localhost:5000/text?debug=true" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello"}'
```

---

## ✅ Checklist Final

- [ ] Backend corriendo en :3001
- [ ] MCP corriendo en :4000
- [ ] Voice Agent corriendo en :5000
- [ ] Frontend corriendo en :3000
- [ ] Health checks todos OK
- [ ] Test de texto funciona
- [ ] Frontend muestra el widget
- [ ] Permisos de micrófono otorgados
- [ ] Audio se graba correctamente
- [ ] Transcripción funciona
- [ ] Respuesta en texto funciona
- [ ] Audio de respuesta se reproduce

---

## 🎉 ¡Éxito!

Si todos los pasos funcionan, tu voice agent con LangGraph está completamente operativo.

Puedes probar diferentes tipos de consultas:
- Búsqueda de productos
- Consulta de stock
- Políticas de la tienda
- Conversación general
