from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from config import DATABASE_URL, JWT_SECRET
from models import db
from routes import api_blueprint

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["JWT_SECRET_KEY"] = JWT_SECRET
CORS(app)
db.init_app(app)
app.register_blueprint(api_blueprint)
# 创建所有未创建的表
with app.app_context():
    db.create_all()


# 或者只允许特定的前端 URL 进行访问
CORS(app, supports_credentials=True)
if __name__ == "__main__":
    app.run(debug=True)
