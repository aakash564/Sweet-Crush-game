from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

DB_FILE = 'scores.json'

def load_scores():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_scores(scores):
    with open(DB_FILE, 'w') as f:
        json.dump(scores, f)

@app.get('/scores')
def get_scores():
    return jsonify(load_scores())

@app.post('/scores')
def post_score():
    data = request.get_json(force=True)
    name = str(data.get('name','')).strip()[:20] or 'Anonymous'
    score = int(data.get('score',0))
    level = int(data.get('level',1))
    scores = load_scores()
    scores.append({'name': name, 'score': score, 'level': level})
    save_scores(scores)
    return jsonify({'ok': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

