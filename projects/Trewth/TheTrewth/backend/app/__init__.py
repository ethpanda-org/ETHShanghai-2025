from flask import Flask
from flask_cors import CORS
from app.transfer_endpoint import tx_transfer
from app.contract_test import c_test
from app.swap_api import swap
import sys, os


def create_app():
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(tx_transfer, url_prefix='/tx_transfer')
    app.register_blueprint(swap, url_prefix='/swap')
    app.register_blueprint(c_test, url_prefix='/c_test')
    return app


