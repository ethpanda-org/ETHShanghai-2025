from flask import Blueprint
from routes.user_route import user_blueprint

api_blueprint = Blueprint('api', __name__, url_prefix='/api')

api_blueprint.register_blueprint(user_blueprint)
