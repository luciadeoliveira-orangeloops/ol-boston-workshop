#!/bin/bash

# Script to fix CORS configuration in AWS API Gateway for ElevenLabs compatibility
# This script configures proper CORS headers for the MCP endpoint

set -e

echo "🔧 AWS API Gateway CORS Configuration Script"
echo "============================================"
echo ""

# Configuration
API_ID="${1:-fsvdcoej2h}"
REGION="${2:-us-east-1}"
STAGE="${3:-dev}"
RESOURCE_PATH="/mcp"

echo "📋 Configuration:"
echo "   API ID: $API_ID"
echo "   Region: $REGION"
echo "   Stage: $STAGE"
echo "   Resource Path: $RESOURCE_PATH"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed"
    echo "   Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS credentials not configured"
    echo "   Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Get resource ID for /mcp
echo "🔍 Finding resource ID for $RESOURCE_PATH..."
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --region "$REGION" \
  --query "items[?path=='$RESOURCE_PATH'].id" \
  --output text)

if [ -z "$RESOURCE_ID" ]; then
    echo "❌ Error: Resource $RESOURCE_PATH not found in API $API_ID"
    echo "   Available resources:"
    aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --query 'items[].path'
    exit 1
fi

echo "✅ Resource ID: $RESOURCE_ID"
echo ""

# Function to configure CORS for a method
configure_cors_for_method() {
    local METHOD=$1
    echo "⚙️  Configuring CORS for $METHOD..."
    
    # Add method response parameters
    aws apigateway put-method-response \
      --rest-api-id "$API_ID" \
      --resource-id "$RESOURCE_ID" \
      --http-method "$METHOD" \
      --status-code 200 \
      --response-parameters \
        "method.response.header.Access-Control-Allow-Origin=true" \
        "method.response.header.Access-Control-Expose-Headers=true" \
        "method.response.header.Mcp-Session-Id=true" \
      --region "$REGION" \
      2>/dev/null || echo "   Method response already exists"
    
    # Add integration response parameters
    aws apigateway put-integration-response \
      --rest-api-id "$API_ID" \
      --resource-id "$RESOURCE_ID" \
      --http-method "$METHOD" \
      --status-code 200 \
      --response-parameters \
        "method.response.header.Access-Control-Allow-Origin='*'" \
        "method.response.header.Access-Control-Expose-Headers='Mcp-Session-Id,Content-Type,Content-Length,ETag,Date'" \
        "method.response.header.Mcp-Session-Id=integration.response.header.Mcp-Session-Id" \
      --region "$REGION" \
      2>/dev/null || echo "   Integration response already exists"
    
    echo "✅ $METHOD configured"
}

# Configure OPTIONS method (preflight)
echo "⚙️  Configuring OPTIONS method (CORS preflight)..."

# Create OPTIONS method if it doesn't exist
aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region "$REGION" \
  2>/dev/null || echo "   OPTIONS method already exists"

# Configure MOCK integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region "$REGION" \
  2>/dev/null || echo "   OPTIONS integration already exists"

# Configure OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    "method.response.header.Access-Control-Allow-Headers=true" \
    "method.response.header.Access-Control-Allow-Methods=true" \
    "method.response.header.Access-Control-Allow-Origin=true" \
    "method.response.header.Access-Control-Max-Age=true" \
  --region "$REGION" \
  2>/dev/null || echo "   OPTIONS method response already exists"

# Configure OPTIONS integration response with full headers
aws apigateway put-integration-response \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    "method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Accept,Last-Event-ID,Mcp-Session-Id,X-Requested-With,Origin,User-Agent,Cache-Control,Pragma'" \
    "method.response.header.Access-Control-Allow-Methods='GET,POST,OPTIONS,PUT,PATCH,DELETE'" \
    "method.response.header.Access-Control-Allow-Origin='*'" \
    "method.response.header.Access-Control-Max-Age='86400'" \
  --region "$REGION" \
  2>/dev/null || echo "   OPTIONS integration response already exists"

echo "✅ OPTIONS method configured"
echo ""

# Configure CORS for GET and POST methods
configure_cors_for_method "GET"
configure_cors_for_method "POST"
echo ""

# Deploy changes
echo "🚀 Deploying changes to stage: $STAGE..."
DEPLOYMENT_ID=$(aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --description "CORS configuration for ElevenLabs compatibility" \
  --region "$REGION" \
  --query 'id' \
  --output text)

echo "✅ Deployed: $DEPLOYMENT_ID"
echo ""

# Construct API URL
API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}${RESOURCE_PATH}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CORS Configuration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test your API with these commands:"
echo ""
echo "# Test OPTIONS (preflight):"
echo "curl -X OPTIONS '$API_URL' \\"
echo "  -H 'Access-Control-Request-Method: POST' \\"
echo "  -H 'Access-Control-Request-Headers: content-type' \\"
echo "  -H 'Origin: https://elevenlabs.io' -v"
echo ""
echo "# Test GET:"
echo "curl '$API_URL' \\"
echo "  -H 'Accept: application/json' \\"
echo "  -H 'Origin: https://elevenlabs.io' -v"
echo ""
echo "# Test POST:"
echo "curl -X POST '$API_URL' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Accept: application/json' \\"
echo "  -H 'Origin: https://elevenlabs.io' \\"
echo "  -d '{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"params\":{},\"id\":1}' -v"
echo ""
echo "🎯 Your MCP endpoint: $API_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Run the test commands above to verify CORS is working"
echo "   2. Update your ElevenLabs agent configuration with this URL"
echo "   3. Test your voice agent!"
echo ""
