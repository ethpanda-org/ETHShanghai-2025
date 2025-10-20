from flask import Blueprint, request, jsonify
from datetime import datetime

user_bp = Blueprint("user", __name__, url_prefix="/api")

@user_bp.route("/users", methods=["GET"])
def get_users():
    # Placeholder for fetching users from DB
    users = [
        {"id": 1, "username": "testuser1", "email": "test1@example.com", "created_at": datetime.utcnow().isoformat()},
        {"id": 2, "username": "testuser2", "email": "test2@example.com", "created_at": datetime.utcnow().isoformat()}
    ]
    return jsonify(users), 200

@user_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user(user_id):
    # Placeholder for fetching a specific user from DB
    if user_id == 1:
        user = {"id": 1, "username": "testuser1", "email": "test1@example.com", "created_at": datetime.utcnow().isoformat()}
        return jsonify(user), 200
    else:
        return jsonify({"message": "User not found"}), 404

@user_bp.route("/user", methods=["POST"])
def create_user():
    data = request.get_json()
    # Placeholder for creating a user in DB
    new_user = {
        "id": 3,
        "username": data.get("username"),
        "email": data.get("email"),
        "created_at": datetime.utcnow().isoformat()
    }
    return jsonify(new_user), 201

