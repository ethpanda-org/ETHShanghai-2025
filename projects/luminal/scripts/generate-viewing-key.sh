#!/usr/bin/env bash
# Viewing Key Generator
# 用途：生成安全的 viewing key 用于状态服务认证

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔑 Luminial Viewing Key Generator${NC}"
echo ""

# 检查 openssl
if ! command -v openssl &> /dev/null; then
    echo -e "${YELLOW}⚠️  openssl not found, using fallback method${NC}"
    # Fallback: 使用 /dev/urandom
    VIEWING_KEY=$(head -c 32 /dev/urandom | base64)
else
    # 推荐方法：使用 openssl
    VIEWING_KEY=$(openssl rand -base64 32)
fi

echo -e "${GREEN}✅ Generated Viewing Key:${NC}"
echo ""
echo "  $VIEWING_KEY"
echo ""

# 询问用户要配置到哪里
echo -e "${YELLOW}Where do you want to use this key?${NC}"
echo "  1) Local development (.env.local)"
echo "  2) State service (.env for backend)"
echo "  3) Production (.env.production)"
echo "  4) Just show me the key (manual configuration)"
echo ""
read -p "Choose [1-4]: " choice

case $choice in
    1)
        ENV_FILE="client/.env.local"
        if [ -f "$ENV_FILE" ]; then
            # 检查是否已存在 VITE_VIEWING_KEY
            if grep -q "VITE_VIEWING_KEY=" "$ENV_FILE"; then
                echo -e "${YELLOW}⚠️  VITE_VIEWING_KEY already exists in $ENV_FILE${NC}"
                read -p "Replace it? [y/N]: " replace
                if [[ $replace =~ ^[Yy]$ ]]; then
                    # macOS 兼容的 sed
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        sed -i '' "s|VITE_VIEWING_KEY=.*|VITE_VIEWING_KEY=$VIEWING_KEY|g" "$ENV_FILE"
                    else
                        sed -i "s|VITE_VIEWING_KEY=.*|VITE_VIEWING_KEY=$VIEWING_KEY|g" "$ENV_FILE"
                    fi
                    echo -e "${GREEN}✅ Updated $ENV_FILE${NC}"
                else
                    echo -e "${YELLOW}Skipped updating file${NC}"
                fi
            else
                echo "" >> "$ENV_FILE"
                echo "VITE_VIEWING_KEY=$VIEWING_KEY" >> "$ENV_FILE"
                echo -e "${GREEN}✅ Added to $ENV_FILE${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  $ENV_FILE not found. Creating...${NC}"
            cat > "$ENV_FILE" <<EOF
VITE_CHAIN=anvil
VITE_PUBLIC_RPC_URL=http://127.0.0.1:8545
VITE_DISABLE_WALLETCONNECT=true
VITE_VIEWING_KEY=$VIEWING_KEY
EOF
            echo -e "${GREEN}✅ Created $ENV_FILE${NC}"
        fi
        ;;

    2)
        ENV_FILE="state-service/.env"
        mkdir -p state-service
        if [ -f "$ENV_FILE" ]; then
            if grep -q "VIEWING_KEY=" "$ENV_FILE"; then
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|VIEWING_KEY=.*|VIEWING_KEY=$VIEWING_KEY|g" "$ENV_FILE"
                else
                    sed -i "s|VIEWING_KEY=.*|VIEWING_KEY=$VIEWING_KEY|g" "$ENV_FILE"
                fi
                echo -e "${GREEN}✅ Updated $ENV_FILE${NC}"
            else
                echo "VIEWING_KEY=$VIEWING_KEY" >> "$ENV_FILE"
                echo -e "${GREEN}✅ Added to $ENV_FILE${NC}"
            fi
        else
            cat > "$ENV_FILE" <<EOF
# State Service Configuration
PORT=3001
RPC_URL=http://127.0.0.1:8545
VAULT_ADDRESS=
VIEWING_KEY=$VIEWING_KEY
EOF
            echo -e "${GREEN}✅ Created $ENV_FILE${NC}"
        fi
        ;;

    3)
        ENV_FILE="client/.env.production"
        echo -e "${YELLOW}⚠️  Production key should be stored securely!${NC}"
        echo "VITE_VIEWING_KEY=$VIEWING_KEY" > "$ENV_FILE"
        echo -e "${GREEN}✅ Created $ENV_FILE${NC}"
        echo -e "${YELLOW}Remember to:${NC}"
        echo "  - Add to .gitignore"
        echo "  - Use secrets management in CI/CD"
        echo "  - Rotate regularly"
        ;;

    4)
        echo -e "${GREEN}Copy this key manually:${NC}"
        echo ""
        echo "  VITE_VIEWING_KEY=$VIEWING_KEY"
        echo ""
        ;;

    *)
        echo -e "${YELLOW}Invalid choice. Key generated but not saved.${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}📋 Usage Examples:${NC}"
echo ""
echo -e "${GREEN}Frontend (.env.local):${NC}"
echo "  VITE_VIEWING_KEY=$VIEWING_KEY"
echo ""
echo -e "${GREEN}Backend (.env):${NC}"
echo "  VIEWING_KEY=$VIEWING_KEY"
echo ""
echo -e "${GREEN}API Query:${NC}"
echo "  curl 'http://localhost:3001/pool-state/0x123...?viewKey=$VIEWING_KEY'"
echo ""

echo -e "${YELLOW}🔒 Security Tips:${NC}"
echo "  - Don't commit to Git (add .env* to .gitignore)"
echo "  - Rotate keys regularly"
echo "  - Use different keys for dev/staging/prod"
echo "  - For production, use secrets manager (AWS Secrets, HashiCorp Vault)"
echo ""
