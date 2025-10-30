import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

def create_app(test_config=None):
    # Create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite'),
    )

    if test_config is None:
        # Load instance config, if it exists
        app.config.from_pyfile('config.py', silent=True)
    else:
        # Load test config
        app.config.from_mapping(test_config)

    # Ensure instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Enable CORS for frontend JS requests
    CORS(app)

    # -----------------------------
    # Route Proxy to OSRM
    # -----------------------------
    @app.route('/api/route')
    def get_route():
        start = request.args.get('start')
        end = request.args.get('end')

        if not start or not end:
            return jsonify({'error': 'Missing start or end parameters'}), 400

        osrm_url = osrm_url = f"https://routing.openstreetmap.de/routed-car/route/v1/driving/{start};{end}?overview=full&geometries=geojson&steps=true"

        try:
            resp = requests.get(osrm_url, timeout=10)
            if resp.status_code != 200:
                print(f"OSRM Error {resp.status_code}: {resp.text[:200]}")
                return jsonify({
                    'error': f'OSRM request failed ({resp.status_code})',
                    'details': resp.text[:200]
                }), 502

            try:
                return jsonify(resp.json())
            except Exception as json_err:
                print("JSON decode error:", json_err)
                print("Response text:", resp.text[:300])
                return jsonify({'error': 'Invalid JSON from OSRM'}), 502

        except requests.exceptions.RequestException as e:
            print("OSRM request exception:", e)
            return jsonify({'error': 'Request to OSRM failed', 'details': str(e)}), 502

        except Exception as e:
            print("Unexpected server error:", e)
            return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

    # -----------------------------
    # Other Flask app setup
    # -----------------------------
    from . import db
    db.init_app(app)

    from . import auth
    app.register_blueprint(auth.bp)

    from . import maps
    app.register_blueprint(maps.bp)
    app.add_url_rule('/', endpoint='index')

    return app