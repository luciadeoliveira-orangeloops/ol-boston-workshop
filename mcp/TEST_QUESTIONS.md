# 🧪 Preguntas de Prueba para el Agente MCP

## 📊 Resumen de la Base de Datos

- **Total productos:** 100
- **Categorías:** Accessories (28), Apparel (49), Footwear (16), Personal Care (7)
- **Rango de precios:** $7.49 - $267.25 (promedio: $51.02)
- **Colores más comunes:** Black (23), White (12), Blue (11), Red (10)

---

## ✅ Preguntas con Resultados Específicos (1-5 productos)

### 1. Búsquedas muy específicas (1-2 productos)

**P1:** "Do you have any classic black handbags?"
- **Esperado:** 1 producto
- **Producto:** Kiara Women Classic Black Handbag ($98.50)
- **Tools a usar:** 
  1. `get_categories` → Ver categorías disponibles
  2. `get_product_types` (category: Accessories) → Ver que Handbags está disponible
  3. `query_products` (category: Accessories, attributes: {type: "Handbags", color: "Black"})

**P2:** "Show me green handbags"
- **Esperado:** 1 producto
- **Producto:** Fossil Women Green Handbag ($40.01)
- **Tools a usar:** Similar a P1

**P3:** "I'm looking for a beige handbag"
- **Esperado:** 1 producto
- **Producto:** Kiara Women Beige & Yellow Handbags ($95.98)

**P4:** "Do you have Nike blue t-shirts?"
- **Esperado:** 1 producto exacto
- **Producto:** Nike Men Blue T-shirt ($14.31)
- **Tools a usar:**
  1. `get_product_types` (category: Apparel)
  2. `query_products` (category: Apparel, attributes: {type: "Tshirts", color: "Blue"})
  3. Filtrar por marca en la descripción

**P5:** "Show me bath robes"
- **Esperado:** 1 producto
- **Categoría:** Apparel
- **Tools a usar:** `query_products` (category: Apparel, attributes: {type: "Bath Robe"})

---

## 🎯 Preguntas con Resultados Múltiples (5-20 productos)

### 2. Búsquedas moderadas

**P6:** "What handbags do you have?"
- **Esperado:** 4 productos
- **Precio range:** $40.01 - $98.50
- **Tools a usar:** `query_products` (category: Accessories, attributes: {type: "Handbags"})

**P7:** "Show me blue t-shirts"
- **Esperado:** 4 productos
- **Precio range:** $14.31 - $30.57
- **Todos:** Nike, ADIDAS, Basics, Classic Polo

**P8:** "Do you have any watches?"
- **Esperado:** 4 productos
- **Categoría:** Accessories
- **Tools a usar:** `query_products` (category: Accessories, attributes: {type: "Watches"})

**P9:** "What wallets are available?"
- **Esperado:** 4 productos
- **Categoría:** Accessories

**P10:** "Show me men's shirts"
- **Esperado:** ~8 productos
- **Categoría:** Apparel
- **Tools a usar:** `query_products` (category: Apparel, attributes: {type: "Shirts", gender: "Men"})

**P11:** "I'm looking for jeans"
- **Esperado:** 3 productos
- **Categoría:** Apparel
- **Tools a usar:** `query_products` (category: Apparel, attributes: {type: "Jeans"})

**P12:** "Do you have backpacks?"
- **Esperado:** 3 productos
- **Categoría:** Accessories

**P13:** "Show me sunglasses"
- **Esperado:** 3 productos
- **Categoría:** Accessories

---

## 🌊 Preguntas Amplias (20+ productos)

### 3. Búsquedas que devuelven muchos productos

**P14:** "What t-shirts do you have?"
- **Esperado:** 24 productos
- **Categoría:** Apparel
- **El más común:** Tshirts
- **Tools a usar:** `query_products` (category: Apparel, attributes: {type: "Tshirts"})

**P15:** "Show me all black products"
- **Esperado:** 23 productos
- **Categorías:** Múltiples (Apparel, Accessories, Footwear)
- **Tools a usar:** `query_products` (attributes: {color: "Black"})

**P16:** "What products do you have for men?"
- **Esperado:** ~50-60 productos
- **Tools a usar:** `query_products` (attributes: {gender: "Men"})

**P17:** "Show me all accessories"
- **Esperado:** 28 productos
- **Tools a usar:** `query_products` (category: Accessories)

**P18:** "What apparel items do you sell?"
- **Esperado:** 49 productos
- **La categoría más grande
- **Tools a usar:** `query_products` (category: Apparel)

**P19:** "Do you have any white products?"
- **Esperado:** 12 productos
- **Tools a usar:** `query_products` (attributes: {color: "White"})

---

## 🔍 Preguntas con Filtros Combinados

### 4. Búsquedas con múltiples filtros

**P20:** "Show me black t-shirts for men under $20"
- **Esperado:** 2-3 productos
- **Tools a usar:** `query_products` (category: Apparel, attributes: {type: "Tshirts", color: "Black", gender: "Men"}, maxPrice: 20)

**P21:** "Do you have blue shirts for men?"
- **Esperado:** 2-4 productos
- **Tools a usar:** `query_products` (category: Apparel, attributes: {type: "Shirts", color: "Blue", gender: "Men"})

**P22:** "What accessories do you have in purple?"
- **Esperado:** 2-3 productos
- **Tools a usar:** `query_products` (category: Accessories, attributes: {color: "Purple"})

**P23:** "Show me products under $15"
- **Esperado:** 5-10 productos
- **Tools a usar:** `query_products` (maxPrice: 15)

**P24:** "What do you have in footwear?"
- **Esperado:** 16 productos
- **Tools a usar:** `query_products` (category: Footwear)

---

## ❌ Preguntas Sin Resultados (para probar manejo de errores)

### 5. Búsquedas que no deberían encontrar nada

**P25:** "Do you have yellow handbags?"
- **Esperado:** 0 productos (solo hay Black, Green, Beige)
- **Respuesta esperada:** "I'm sorry, we don't have any yellow handbags. We do have handbags in black, green, and beige. Would you like to see those?"

**P26:** "Show me orange t-shirts"
- **Esperado:** 0 productos
- **Respuesta esperada:** Sugerir colores disponibles (Blue, Black, White, etc.)

**P27:** "Do you have laptops?"
- **Esperado:** 0 productos (no existe esa categoría/tipo)
- **Respuesta esperada:** "I'm sorry, we don't carry laptops. We specialize in apparel, accessories, footwear, and personal care items."

**P28:** "I'm looking for winter coats"
- **Esperado:** 0-1 productos (solo hay 1 Jacket)
- **Respuesta esperada:** Mencionar que hay 1 jacket disponible

**P29:** "Show me products over $300"
- **Esperado:** 0 productos (máximo es $267.25)
- **Respuesta esperada:** "All our products are under $270. Would you like to see our premium items?"

**P30:** "Do you have furniture?"
- **Esperado:** 0 productos
- **Respuesta esperada:** Explicar las categorías disponibles

---

## 🔄 Preguntas de Exploración (sin búsqueda específica)

### 6. Preguntas que requieren usar get_categories / get_product_types

**P31:** "What kinds of products do you sell?"
- **Tools a usar:** `get_categories`
- **Respuesta esperada:** Listar las 4 categorías principales

**P32:** "What types of accessories do you have?"
- **Tools a usar:** `get_product_types` (category: Accessories)
- **Respuesta esperada:** Watches, Handbags, Wallets, Backpacks, Sunglasses, Belts, etc.

**P33:** "What colors are available?"
- **Tools a usar:** `get_attributes`
- **Respuesta esperada:** Black, White, Blue, Red, Purple, Grey, etc.

**P34:** "Do you have products for women?"
- **Tools a usar:** `get_attributes` → Ver genders disponibles
- **Luego:** `query_products` (attributes: {gender: "Women"})

**P35:** "What's your price range?"
- **Tools a usar:** `query_products` (limit: 100)
- **Respuesta esperada:** Calcular min/max de los resultados: $7.49 - $267.25

---

## 🎯 Preguntas de Stock

### 7. Consultas de disponibilidad

**P36:** "Is the Kiara Women Classic Black Handbag in stock?"
- **Tools a usar:** 
  1. `query_products` para encontrar el ID
  2. `query_stock` (productId: encontrado)
- **Esperado:** Stock: 17 unidades

**P37:** "How many Nike blue t-shirts do you have?"
- **Similar a P36**
- **Esperado:** Ver stock disponible

**P38:** "Are there any out of stock items?"
- **Tools a usar:** `query_products` (inStock: false) si el backend lo soporta
- O filtrar resultados donde stock = 0

---

## 📋 Resumen de Flujos Esperados

### Flujo Típico para "Show me black handbags":

```
1. Usuario: "Show me black handbags"
2. Agente piensa: Necesito buscar handbags negros
3. Tool: get_categories → ["Accessories", "Apparel", "Footwear", "Personal Care"]
4. Agente piensa: Handbags probablemente está en Accessories
5. Tool: get_product_types(category: "Accessories") → [..., "Handbags", ...]
6. Tool: query_products(category: "Accessories", attributes: {type: "Handbags", color: "Black"})
7. Resultado: 2 handbags negros
8. Agente responde: "I found 2 black handbags: Kiara Women Glossy Black Handbag at $64.98 and Kiara Women Classic Black Handbag at $98.50. Would you like more details on either?"
```

---

## ✅ Checklist de Validación

Al probar, el agente debería:

- [ ] Usar `get_categories` cuando no sabe las categorías
- [ ] Usar `get_product_types` para entender la jerarquía category → type
- [ ] Usar `get_attributes` para ver colores/opciones disponibles
- [ ] Mapear correctamente:
  - "handbags" → category: "Accessories", type: "Handbags"
  - "t-shirts" / "tshirts" → category: "Apparel", type: "Tshirts"
  - Colors como "black" → "Black" (case-insensitive en backend)
- [ ] No inventar productos que no existen
- [ ] Sugerir alternativas cuando no hay resultados
- [ ] Resumir resultados naturalmente (no leer JSON crudo)
- [ ] Manejar precios y stock correctamente
