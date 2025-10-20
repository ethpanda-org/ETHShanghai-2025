import os
import sys
import logging
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_caching import Cache
from redis import Redis

# DON\'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import database and models
from src.models.user import db
from src.models.account import Account
from src.models.transaction import Transaction, AutoSplitRule
from src.models.defi import DeFiInvestment, StreamingPayment
from src.models.kyc import KYCVerification, PaymentMethod

# Import blueprints from existing routes
from src.routes.user import user_bp
from src.routes.account import account_bp
from src.routes.defi import defi_bp
from src.routes.kyc import kyc_bp

# Import blueprints and managers from new handler modules
from src.routes.transaction_handler import transaction_bp as new_transaction_bp, TransactionProcessor
from src.routes.auth_handler import auth_bp as new_auth_bp, AuthenticationManager

# Import utilities
from src.utils.jwt_auth import jwt_auth
from src.utils.face_recognition import face_recognition_service
from src.utils.nfc_payment import nfc_payment_service
from src.utils.blockchain_wallet import WalletManager
from src.utils.payment_gateway import PaymentGateway
from src.utils.realtime_updates import RealtimeUpdateManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("protocol_bank_api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Load configuration from environment variables
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "your_super_secret_key_here") # Use a strong, unique key
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:////home/ubuntu/protocol-bank-api/database/app.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["REDIS_URL"] = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Enable CORS
CORS(app, origins="*") # In production, restrict origins to your frontend domain

# Initialize database
db.init_app(app)
with app.app_context():
    db.create_all()

# Initialize Redis
try:
    redis_client = Redis.from_url(app.config["REDIS_URL"], decode_responses=True)
    redis_client.ping() # Test connection
    logger.info("Connected to Redis successfully!")
except Exception as e:
    logger.error(f"Could not connect to Redis: {e}")
    redis_client = None # Fallback if Redis is not available

# Initialize Cache
cache = Cache(app, config={
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_URL': app.config["REDIS_URL"]
})

# Initialize Solana and Ethereum clients (placeholders for now)
# In a real application, these would be proper client instances
class SolanaClientPlaceholder:
    def get_balance(self, public_key): return 0
    def send_transaction(self, tx_data): return "mock_solana_tx_sig"

class EthereumClientPlaceholder:
    def get_balance(self, address): return 0
    class Eth:
        def get_balance(self, address): return 0
        def send_transaction(self, tx_data): return "mock_eth_tx_hash"
        def gas_price(self): return 20000000000 # 20 Gwei
    eth = Eth()

solana_client = SolanaClientPlaceholder()
ethereum_client = EthereumClientPlaceholder()

# Initialize managers and services
auth_manager = AuthenticationManager(db, redis_client)
transaction_processor = TransactionProcessor(db, solana_client, ethereum_client, redis_client)
wallet_manager = WalletManager(solana_client, ethereum_client, redis_client)
payment_gateway = PaymentGateway(redis_client=redis_client)
realtime_update_manager = RealtimeUpdateManager(redis_client=redis_client)

# Initialize security services
jwt_auth.init_app(app)
face_recognition_service.init_app(app) # Assuming these don\'t need db/redis directly
nfc_payment_service.init_app(app) # Assuming these don\'t need db/redis directly

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(account_bp, url_prefix='/api')
app.register_blueprint(defi_bp, url_prefix='/api')
app.register_blueprint(kyc_bp, url_prefix='/api')

# Register new transaction and auth blueprints
app.register_blueprint(new_transaction_bp, url_prefix='/api/transactions')
app.register_blueprint(new_auth_bp, url_prefix='/api/auth')

# Example route for testing (can be removed later)
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "API is running"}), 200


# Serve static files for the frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Adjust this path to point to your frontend\'s production build directory
    static_folder_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'protocol-bank', 'dist')
    
    if not os.path.exists(static_folder_path):
        logger.warning(f"Static folder not found at: {static_folder_path}")
        return "Frontend build not found", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

