"""Same-origin web deployment; one worker is required by the in-process matcher."""
import os
import threading
from pathlib import Path
from flask import jsonify, send_from_directory
from sqlalchemy import text
from app import app, db, worker

frontend = Path(os.getenv('FRONTEND_DIST', '../frontend/dist')).resolve()

@app.get('/healthz')
def health():
    db.session.execute(text('SELECT 1'))
    return jsonify(status='ok')

@app.get('/')
@app.get('/<path:path>')
def frontend_page(path=''):
    if path == 'api' or path.startswith('api/') or path.startswith('socket.io'):
        return jsonify(error='Endpoint not found'), 404
    candidate = (frontend / path).resolve()
    if candidate.is_relative_to(frontend) and candidate.is_file():
        return send_from_directory(frontend, path)
    if path.startswith('assets/'):
        return jsonify(error='Asset not found'), 404
    return send_from_directory(frontend, 'index.html')

threading.Thread(target=worker, daemon=True).start()
