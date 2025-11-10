#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VOICE_AGENT_URL="http://localhost:5001"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Testing LangGraph Voice Agent${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to test a question
test_question() {
    local question=$1
    echo -e "${YELLOW}Question:${NC} $question"
    echo -e "${GREEN}Response:${NC}"
    
    response=$(curl -s -X POST "$VOICE_AGENT_URL/text" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"$question\"}")
    
    echo "$response" | jq -r '.responseText // .error // "No response"'
    echo -e "\n${BLUE}---${NC}\n"
}

# Check if voice agent is running
echo "Checking if voice agent is running..."
if ! curl -s "$VOICE_AGENT_URL/health" > /dev/null; then
    echo -e "${YELLOW}❌ Voice agent is not responding at $VOICE_AGENT_URL${NC}"
    echo "Make sure Docker containers are running: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓ Voice agent is running${NC}\n"

# Test questions about products
echo -e "${BLUE}🔍 Product Search Questions${NC}\n"

test_question "Do you have any blue shirts available?"

test_question "What backpacks do you have in stock?"

test_question "Show me yellow products under 20 dollars"

test_question "Do you have any Ray-Ban sunglasses?"

test_question "What's the price of the Wildcraft backpack?"

echo -e "${BLUE}📦 Stock Questions${NC}\n"

test_question "How many Myntra shirts are in stock?"

test_question "Is product 51420 available?"

echo -e "${BLUE}📋 Category Questions${NC}\n"

test_question "What categories of products do you sell?"

test_question "Show me all footwear products"

test_question "What accessories do you have?"

echo -e "${BLUE}✅ Testing complete!${NC}"
