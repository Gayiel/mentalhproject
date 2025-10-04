from flask import Flask, request, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.get_json(force=True)
    entry = data.get('entry') if isinstance(data, dict) else None
    mood = None
    if entry and isinstance(entry, dict):
        mood = entry.get('mood')

    score_map = {5: 95, 4: 80, 3: 60, 2: 35, 1: 10}
    score = score_map.get(mood, random.randint(20, 90))

    severity = 'low'
    if score < 40:
        severity = 'high'
    elif score < 60:
        severity = 'moderate'

    suggestions = []
    if severity == 'high':
        suggestions = [
            'If you are in immediate danger call emergency services',
            'Consider contacting a trusted friend or family member',
            'Use grounding techniques: 5-4-3-2-1 sensory check'
        ]
    elif severity == 'moderate':
        suggestions = [
            'Try a short walk or movement break',
            'Practice 4-4-8 breathing for 2 minutes',
            'Reflect on one small, achievable step'
        ]
    else:
        suggestions = ['Keep tracking — small steps add up']

    return jsonify({
        'score': score,
        'severity': severity,
        'suggestions': suggestions,
        'raw': entry
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
