from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for
)
from werkzeug.exceptions import abort

from flaskmaps.auth import login_required
from flaskmaps.db import get_db

bp = Blueprint('maps', __name__)

@bp.route('/')
def index():
    return render_template('index/index.html')