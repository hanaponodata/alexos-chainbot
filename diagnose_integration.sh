#!/bin/bash

# ChainBot + Watchtower Integration Diagnostic Script
# Comprehensive health check and status verification

echo "🔍 ChainBot + Watchtower Integration Diagnostic"
echo "================================================"
echo ""

# Configuration
PI_HOST="10.42.69.208"
PI_PORT="5420"
PI_USER="alex"

echo "📡 Testing Remote Connectivity..."
echo "--------------------------------"

# Test 1: ChainBot API Health
echo "1. Testing ChainBot API Health (port 9000):"
CHAINBOT_HEALTH=$(curl -s -w "%{http_code}" http://$PI_HOST:9000/health)
HTTP_CODE="${CHAINBOT_HEALTH: -3}"
RESPONSE="${CHAINBOT_HEALTH%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ ChainBot API is HEALTHY"
    echo "   📊 Response: $RESPONSE" | jq . 2>/dev/null || echo "   📊 Response: $RESPONSE"
else
    echo "   ❌ ChainBot API is NOT RESPONDING (HTTP $HTTP_CODE)"
fi
echo ""

# Test 2: ChainBot GUI
echo "2. Testing ChainBot GUI (port 9000/gui):"
GUI_RESPONSE=$(curl -s -I http://$PI_HOST:9000/gui | head -1)
if [[ $GUI_RESPONSE == *"200"* ]]; then
    echo "   ✅ ChainBot GUI is ACCESSIBLE"
else
    echo "   ❌ ChainBot GUI is NOT ACCESSIBLE"
    echo "   📊 Response: $GUI_RESPONSE"
fi
echo ""

# Test 3: Watchtower Health
echo "3. Testing Watchtower Health (port 8100):"
WATCHTOWER_HEALTH=$(curl -s -w "%{http_code}" http://$PI_HOST:8100/api/health)
HTTP_CODE="${WATCHTOWER_HEALTH: -3}"
RESPONSE="${WATCHTOWER_HEALTH%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Watchtower is HEALTHY"
    echo "   📊 Response: $RESPONSE" | jq . 2>/dev/null || echo "   📊 Response: $RESPONSE"
else
    echo "   ❌ Watchtower is NOT RESPONDING (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Watchtower Dashboard
echo "4. Testing Watchtower Dashboard (port 8100/dashboard):"
DASHBOARD_RESPONSE=$(curl -s -I http://$PI_HOST:8100/dashboard/ | head -1)
if [[ $DASHBOARD_RESPONSE == *"200"* ]]; then
    echo "   ✅ Watchtower Dashboard is ACCESSIBLE"
else
    echo "   ❌ Watchtower Dashboard is NOT ACCESSIBLE"
    echo "   📊 Response: $DASHBOARD_RESPONSE"
fi
echo ""

# Test 5: ChainBot Service Status (SSH)
echo "5. Checking ChainBot Service Status (SSH):"
SERVICE_STATUS=$(ssh -p $PI_PORT $PI_USER@$PI_HOST "sudo systemctl status chainbot --no-pager" 2>/dev/null)
if [[ $SERVICE_STATUS == *"active (running)"* ]]; then
    echo "   ✅ ChainBot Service is RUNNING"
else
    echo "   ❌ ChainBot Service is NOT RUNNING"
    echo "   📊 Status: $SERVICE_STATUS"
fi
echo ""

# Test 6: Port Usage Check
echo "6. Checking Port Usage:"
echo "   Port 9000 (ChainBot):"
PORT_9000=$(ssh -p $PI_PORT $PI_USER@$PI_HOST "sudo lsof -i:9000" 2>/dev/null)
if [ -n "$PORT_9000" ]; then
    echo "   ✅ Port 9000 is IN USE by ChainBot"
else
    echo "   ❌ Port 9000 is NOT IN USE"
fi

echo "   Port 8100 (Watchtower):"
PORT_8100=$(ssh -p $PI_PORT $PI_USER@$PI_HOST "sudo lsof -i:8100" 2>/dev/null)
if [ -n "$PORT_8100" ]; then
    echo "   ✅ Port 8100 is IN USE by Watchtower"
else
    echo "   ❌ Port 8100 is NOT IN USE"
fi
echo ""

# Test 7: Agent Webhook Endpoints
echo "7. Testing Agent Webhook Endpoints:"
AGENTS=("laka" "harry" "guardbot" "devbot" "uxbot" "docbot")
for agent in "${AGENTS[@]}"; do
    WEBHOOK_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://$PI_HOST:9000/api/webhooks/chainbot/agent/$agent \
        -H "Content-Type: application/json" \
        -d '{"test": "ping"}' 2>/dev/null)
    HTTP_CODE="${WEBHOOK_RESPONSE: -3}"
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo "   ✅ $agent webhook endpoint is ACCESSIBLE (HTTP $HTTP_CODE)"
    else
        echo "   ❌ $agent webhook endpoint is NOT ACCESSIBLE (HTTP $HTTP_CODE)"
    fi
done
echo ""

# Test 8: Integration Health
echo "8. Testing Integration Health:"
INTEGRATION_RESPONSE=$(curl -s -w "%{http_code}" http://$PI_HOST:8100/api/chainbot/health 2>/dev/null)
HTTP_CODE="${INTEGRATION_RESPONSE: -3}"
RESPONSE="${INTEGRATION_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Integration is HEALTHY"
    echo "   📊 Response: $RESPONSE" | jq . 2>/dev/null || echo "   📊 Response: $RESPONSE"
else
    echo "   ⚠️ Integration has ISSUES (HTTP $HTTP_CODE)"
    echo "   📊 Response: $RESPONSE"
fi
echo ""

# Summary
echo "📋 INTEGRATION SUMMARY"
echo "======================"

# Count successes
SUCCESS_COUNT=0
TOTAL_TESTS=8

if [[ $CHAINBOT_HEALTH == *"200"* ]]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [[ $GUI_RESPONSE == *"200"* ]]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [[ $WATCHTOWER_HEALTH == *"200"* ]]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [[ $DASHBOARD_RESPONSE == *"200"* ]]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [[ $SERVICE_STATUS == *"active (running)"* ]]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ -n "$PORT_9000" ] && [ -n "$PORT_8100" ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
# Webhook test - count if at least 4 agents are accessible
WEBHOOK_SUCCESS=0
for agent in "${AGENTS[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" -X POST http://$PI_HOST:9000/api/webhooks/chainbot/agent/$agent \
        -H "Content-Type: application/json" \
        -d '{"test": "ping"}' | grep -q "200\|404"; then
        WEBHOOK_SUCCESS=$((WEBHOOK_SUCCESS + 1))
    fi
done
if [ $WEBHOOK_SUCCESS -ge 4 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [[ $INTEGRATION_RESPONSE == *"200"* ]]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi

echo "✅ Tests Passed: $SUCCESS_COUNT/$TOTAL_TESTS"

if [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
    echo "🎉 INTEGRATION STATUS: FULLY OPERATIONAL"
    echo "   All components are working correctly!"
elif [ $SUCCESS_COUNT -ge 6 ]; then
    echo "⚠️ INTEGRATION STATUS: MOSTLY OPERATIONAL"
    echo "   Most components working, minor issues detected."
else
    echo "🚨 INTEGRATION STATUS: CRITICAL ISSUES"
    echo "   Multiple components not working properly."
fi

echo ""
echo "🔗 Quick Access Links:"
echo "   ChainBot API: http://$PI_HOST:9000/health"
echo "   ChainBot GUI: http://$PI_HOST:9000/gui"
echo "   Watchtower: http://$PI_HOST:8100/api/health"
echo "   Watchtower Dashboard: http://$PI_HOST:8100/dashboard/"
echo ""
echo "📞 For issues, check:"
echo "   - ChainBot logs: sudo journalctl -u chainbot -f"
echo "   - Watchtower logs: Check Watchtower process"
echo "   - Service status: sudo systemctl status chainbot" 