from flask import Blueprint

agent = Blueprint('agent', __name__)


@agent.route('/')
def agent_homepage():
    return "This is agent page"
