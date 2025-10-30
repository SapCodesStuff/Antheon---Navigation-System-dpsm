from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for
)
from werkzeug.exceptions import abort

from flaskmaps.auth import login_required
from flaskmaps.db import get_db

bp = Blueprint('maps', __name__)

@bp.route('/')
def index():
    
    if (g.user):
        db = get_db()
        locations = db.execute(
            '''
            SELECT l.id, l.name, l.location_x, l.location_y, l.author_id, u.username
            FROM location l
            JOIN user u ON l.author_id = u.id
            ORDER BY l.id DESC
            '''
        ).fetchall()

        print("Fetched locations:", locations)
    else:
        locations = []

    return render_template('index/index.html', locations=locations)

@bp.route('/add_location', methods=['POST'])
@login_required
def add_location():
    db = get_db()
    data = request.get_json()

    name = data.get('name')
    location_x = data.get('x')
    location_y = data.get('y')

    if not name or location_x is None or location_y is None:
        return {'error': 'Missing required fields'}, 400

    try:
        db.execute(
            '''
            INSERT INTO location (name, location_x, location_y, author_id)
            VALUES (?, ?, ?, ?)
            ''',
            (name, location_x, location_y, g.user['id'])
        )
        db.commit()
    except Exception as e:
        print("Error inserting location:", e)
        return {'error': 'Database error'}, 500

    return {'success': True, 'message': 'Location added successfully'}

@bp.route('/delete_location/<int:id>', methods=['DELETE'])
@login_required
def delete_location(id):
    db = get_db()
    location = db.execute(
        'SELECT id, author_id FROM location WHERE id = ?', (id,)
    ).fetchone()

    if location is None:
        return {'error': 'Location not found'}, 404

    # Security check — only allow author to delete
    if location['author_id'] != g.user['id']:
        return {'error': 'Unauthorized'}, 403

    try:
        db.execute('DELETE FROM location WHERE id = ?', (id,))
        db.commit()
    except Exception as e:
        print("Error deleting location:", e)
        return {'error': 'Database error'}, 500

    return {'success': True, 'message': f'Location {id} deleted successfully'}