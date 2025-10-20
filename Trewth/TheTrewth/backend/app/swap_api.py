from flask import Blueprint, request

swap = Blueprint('swap', __name__)


@swap.route('/get_pools')
def get_pools():
    return "This is Module 1"
