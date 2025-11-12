# 🔧 Configurar CORS en AWS API Gateway para ElevenLabs

## El Problema
Tu MCP funciona con Claude Desktop pero no con ElevenLabs porque API Gateway necesita configuración CORS adicional.

## Solución: Configurar CORS en API Gateway

### Opción 1: Usando la Consola de AWS (Recomendado - Más Fácil)

1. **Ir a API Gateway Console**
   - Ve a: https://console.aws.amazon.com/apigateway
   - Busca tu API (probablemente se llama algo relacionado con "mcp" o "workshop")
   - Tu API ID es: `fsvdcoej2h`

2. **Habilitar CORS**
   - Selecciona tu API
   - En el panel izquierdo, busca tu recurso `/mcp`
   - Click en "Actions" → "Enable CORS"
   
3. **Configurar CORS Headers**
   
   En la ventana de configuración CORS, asegúrate de tener:
   
   **Access-Control-Allow-Origin:**
   ```
   '*'
   ```
   
   **Access-Control-Allow-Headers:**
   ```
   Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Accept,Last-Event-ID,Mcp-Session-Id,X-Requested-With,Origin,User-Agent,Cache-Control,Pragma
   ```
   
   **Access-Control-Allow-Methods:**
   ```
   GET,POST,OPTIONS,PUT,PATCH,DELETE
   ```
   
   **Access-Control-Expose-Headers:**
   ```
   Mcp-Session-Id,Content-Type,Content-Length,ETag,Date
   ```
   
   **Access-Control-Max-Age:**
   ```
   86400
   ```

4. **Aplicar y Desplegar**
   - Click en "Enable CORS and replace existing CORS headers"
   - Confirma los cambios
   - **IMPORTANTE:** Ve a "Actions" → "Deploy API"
   - Selecciona tu stage (probablemente "dev")
   - Click "Deploy"

5. **Verificar**
   ```bash
   curl -X OPTIONS https://fsvdcoej2h.execute-api.us-east-1.amazonaws.com/dev/mcp \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: content-type" \
     -H "Origin: https://elevenlabs.io" -v
   ```
   
   Deberías ver headers CORS completos en la respuesta.

---

### Opción 2: Usando AWS CLI

Si prefieres automatizar o usar CLI:

```bash
# Obtener tu API ID (ya lo sabes: fsvdcoej2h)
API_ID="fsvdcoej2h"
REGION="us-east-1"
STAGE="dev"

# Buscar el resource ID de /mcp
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/mcp`].id' \
  --output text)

echo "Resource ID: $RESOURCE_ID"

# Crear método OPTIONS si no existe
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region $REGION

# Configurar integration para OPTIONS
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --integration-http-method OPTIONS \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region $REGION

# Configurar respuesta del método OPTIONS
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    method.response.header.Access-Control-Allow-Headers=true,\
method.response.header.Access-Control-Allow-Methods=true,\
method.response.header.Access-Control-Allow-Origin=true \
  --region $REGION

# Configurar respuesta de integration para OPTIONS
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    method.response.header.Access-Control-Allow-Headers="'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Accept,Last-Event-ID,Mcp-Session-Id,X-Requested-With,Origin,User-Agent,Cache-Control,Pragma'",\
method.response.header.Access-Control-Allow-Methods="'GET,POST,OPTIONS,PUT,PATCH,DELETE'",\
method.response.header.Access-Control-Allow-Origin="'*'" \
  --region $REGION

# Hacer lo mismo para GET
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-parameters \
    method.response.header.Access-Control-Allow-Origin=true,\
method.response.header.Mcp-Session-Id=true \
  --region $REGION

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-parameters \
    method.response.header.Access-Control-Allow-Origin="'*'",\
method.response.header.Mcp-Session-Id="integration.response.header.Mcp-Session-Id" \
  --region $REGION

# Hacer lo mismo para POST
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --response-parameters \
    method.response.header.Access-Control-Allow-Origin=true,\
method.response.header.Mcp-Session-Id=true \
  --region $REGION

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --response-parameters \
    method.response.header.Access-Control-Allow-Origin="'*'",\
method.response.header.Mcp-Session-Id="integration.response.header.Mcp-Session-Id" \
  --region $REGION

# Desplegar los cambios
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $STAGE \
  --region $REGION

echo "✅ CORS configurado y desplegado en API Gateway"
```

---

### Opción 3: Si usas Serverless Framework o SAM

Si tienes un `serverless.yml` o template SAM, añade:

**Para Serverless Framework:**
```yaml
functions:
  mcp:
    handler: handler.main
    events:
      - http:
          path: mcp
          method: any
          cors:
            origin: '*'
            headers:
              - Content-Type
              - X-Amz-Date
              - Authorization
              - X-Api-Key
              - X-Amz-Security-Token
              - Accept
              - Last-Event-ID
              - Mcp-Session-Id
              - X-Requested-With
              - Origin
              - User-Agent
              - Cache-Control
              - Pragma
            allowCredentials: false
            maxAge: 86400
            exposedResponseHeaders:
              - Mcp-Session-Id
              - Content-Type
              - Content-Length
```

**Para AWS SAM:**
```yaml
Resources:
  McpApi:
    Type: AWS::Serverless::Api
    Properties:
      Cors:
        AllowOrigin: "'*'"
        AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Accept,Last-Event-ID,Mcp-Session-Id,X-Requested-With,Origin,User-Agent,Cache-Control,Pragma'"
        AllowMethods: "'GET,POST,OPTIONS,PUT,PATCH,DELETE'"
        MaxAge: "'86400'"
```

---

## Verificación Final

Después de configurar CORS en API Gateway:

```bash
# Test 1: OPTIONS preflight
curl -X OPTIONS https://fsvdcoej2h.execute-api.us-east-1.amazonaws.com/dev/mcp \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -H "Origin: https://elevenlabs.io" \
  -v 2>&1 | grep -i "access-control"

# Test 2: GET request
curl https://fsvdcoej2h.execute-api.us-east-1.amazonaws.com/dev/mcp \
  -H "Accept: application/json" \
  -H "Origin: https://elevenlabs.io" \
  -v 2>&1 | grep -i "access-control"

# Test 3: POST request
curl -X POST https://fsvdcoej2h.execute-api.us-east-1.amazonaws.com/dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Origin: https://elevenlabs.io" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' \
  -v 2>&1 | grep -i "access-control"
```

Todos deberían retornar:
```
access-control-allow-origin: *
access-control-allow-methods: GET,POST,OPTIONS,PUT,PATCH,DELETE
access-control-allow-headers: (lista completa)
```

---

## Actualizar el Código de tu Servidor (Ya está hecho)

Ya actualicé el código en `/mcp/src/index.ts` con mejores headers CORS. Cuando despliegues la nueva versión:

```bash
# En tu servidor/EC2/donde esté corriendo
cd /path/to/workshop
git pull
docker compose -f docker-compose.prod.yml up -d --build mcp
```

---

## Troubleshooting

### Si todavía no funciona:

1. **Verifica que desplegaste los cambios en API Gateway** (paso crucial)
2. **Limpia la caché de API Gateway**: Actions → "Clear cache"
3. **Verifica los logs**: CloudWatch Logs de API Gateway
4. **Prueba con curl** antes de probar con ElevenLabs
5. **Asegúrate de que estás usando la URL correcta** en ElevenLabs

### Logs útiles:

```bash
# Ver logs de API Gateway
aws logs tail /aws/apigateway/fsvdcoej2h --follow --region us-east-1

# Ver logs de Lambda (si usas Lambda)
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow --region us-east-1
```

---

## Resumen

**La clave:** API Gateway necesita su propia configuración CORS independiente de tu aplicación Express. Ambas capas deben estar configuradas correctamente para que ElevenLabs funcione.

1. ✅ Código Express actualizado (ya hecho)
2. ⚠️ **API Gateway CORS** (necesitas hacer esto)
3. ✅ Desplegar ambos cambios

Una vez que configures CORS en API Gateway, ElevenLabs debería funcionar perfectamente.
