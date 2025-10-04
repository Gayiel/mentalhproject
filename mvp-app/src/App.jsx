import React, { useEffect, useState, useRef } from 'react'

const STORAGE_KEY = 'accessibleMoodHistory'
const API_URL = 'http://127.0.0.1:5000/evaluate'
const FETCH_TIMEOUT_MS = 5000

function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')),
      timeout)
    fetch(url, options)
      .then(res => {
        clearTimeout(timer)
        if (!res.ok) return res.text().then(t => { throw new Error(`Server error: ${res.status} ${t}`) })
        return res.json()
      })
      .then(json => resolve(json))
      .catch(err => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

function localEvaluate(entry) {
  const mood = entry && entry.mood ? Number(entry.mood) : null
  const scoreMap = {5: 95, 4: 80, 3: 60, 2: 35, 1: 10}
  const score = scoreMap[mood] ?? Math.floor(Math.random() * 70) + 20
  let severity = 'low'
  if (score < 40) severity = 'high'
  else if (score < 60) severity = 'moderate'
  const suggestions = severity === 'high' ? [
    'If you are in immediate danger call emergency services',
    'Contact a trusted person or a crisis line',
    'Try grounding: 5-4-3-2-1 sensory check'
  ] : severity === 'moderate' ? [
    'Take a short walk or breathing break',
    'Try 4-4-8 breathing for two minutes',
    'Consider reaching out to someone you trust'
  ] : ['Keep tracking — small steps add up']

  return { score, severity, suggestions, raw: entry }
}

function AlertTriangleIcon() { return (<span role="img" aria-label="alert">⚠️</span>); }
function CheckCircleIcon() { return (<span role="img" aria-label="ok">✅</span>); }
function XCircleIcon() { return (<span role="img" aria-label="no">❌</span>); }

export default function App() {
  const [logs, setLogs] = useState([])
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [crisisDetected, setCrisisDetected] = useState(false)
  const [evaluationScore, setEvaluationScore] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setLogs(raw ? JSON.parse(raw) : [])
    } catch (e) {
      setLogs([])
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isTyping])

  async function evaluateRemote(entry) {
    const data = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry })
    }, FETCH_TIMEOUT_MS)
    return data
  }

  async function handleEvaluate(entry, { allowFallback = true } = {}) {
    setResponse({ loading: true })
    setLastError(null)
    try {
      const data = await evaluateRemote(entry)
      setResponse({ loading: false, data })
    } catch (err) {
      const message = err && err.message ? err.message : String(err)
      setLastError(message)
      setResponse({ loading: false, error: message })
      if (allowFallback) {
        const fallback = localEvaluate(entry)
        setResponse({ loading: false, data: fallback, fromFallback: true })
      }
    }
  }

  // ---- Chat / Demo logic ported from embedded demo ----
  const crisisPatterns = {
    suicide: ['kill myself', 'end my life', 'suicide', 'want to die', 'no reason to live'],
    selfHarm: ['hurt myself', 'cutting', 'self-harm', 'harm myself'],
    severity: ['cannot go on', 'no hope', 'everyone would be better', 'goodbye']
  }

  const detectCrisis = (text) => {
    const lowerText = (text || '').toLowerCase()
    let crisisType = null
    let severity = 'low'
    for (const type in crisisPatterns) {
      const patterns = crisisPatterns[type]
      for (let i = 0; i < patterns.length; i++) {
        if (lowerText.includes(patterns[i])) {
          crisisType = type
          if (type === 'suicide' || type === 'severity') severity = 'high'
          else severity = 'medium'
          break
        }
      }
      if (crisisType) break
    }
    return { detected: !!crisisType, type: crisisType, severity }
  }

  const evaluateResponseLocal = (userMessage, botResponse, crisisInfo) => {
    let score = 85
    const checks = { empathy: true, resourceProvided: false, escalation: false, appropriate: true }
    if (crisisInfo.detected) {
      const lowerResponse = (botResponse || '').toLowerCase()
      if (lowerResponse.includes('crisis') || lowerResponse.includes('hotline') || lowerResponse.includes('988')) { checks.resourceProvided = true; score += 10 } else score -= 20
      if (lowerResponse.includes('professional') || lowerResponse.includes('emergency')) { checks.escalation = true; score += 5 } else score -= 15
    }
    return { score: Math.max(0, Math.min(100, score)), checks }
  }

  const generateResponse = (userMsg, crisis) => {
    if (crisis.detected && crisis.severity === 'high') {
      return { text: "I'm deeply concerned. Please call or text 988 right now or go to an emergency room.", route: 'immediate_escalation' }
    } else if (crisis.detected && crisis.severity === 'medium') {
      return { text: "I hear you're going through a tough time. The 988 Lifeline is available 24/7.", route: 'escalation_recommended' }
    } else {
      return { text: "Thanks for sharing. Can you tell me more about what's been going on?", route: 'standard_support' }
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const userMessage = { type: 'user', text: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setTimeout(() => {
      const crisis = detectCrisis(input)
      setCrisisDetected(crisis.detected)
      const responseMsg = generateResponse(input, crisis)
      const botMessage = { type: 'bot', text: responseMsg.text, route: responseMsg.route }
      setMessages(prev => [...prev, botMessage])
      const evaluation = evaluateResponseLocal(input, responseMsg.text, crisis)
      setEvaluationScore(evaluation)
      setIsTyping(false)
    }, 700)
  }

  const testScenarios = [
    { label: 'High Crisis', preview: 'I want to end my life...', text: 'I want to end my life. I cannot do this anymore.', severity: 'high' },
    { label: 'Medium Crisis', preview: 'I have been hurting myself...', text: 'I have been hurting myself when I feel overwhelmed.', severity: 'medium' },
    { label: 'Standard Support', preview: 'Feeling really anxious...', text: 'I have been feeling really anxious lately about everything.', severity: 'low' }
  ]

  const TestScenario = ({ scenario, onClick }) => (
    <button onClick={onClick} className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
      <div className="font-medium text-gray-900">{scenario.label}</div>
      <div className="text-sm text-gray-600 mt-1">{scenario.preview}</div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-xs px-2 py-1 rounded ${scenario.severity === 'high' ? 'bg-red-100 text-red-700' : scenario.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {scenario.severity.toUpperCase()}
        </span>
      </div>
    </button>
  )

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Mental Health Chatbot MVP</h1>
        <p className="text-gray-600">Crisis Detection, AI Evaluation & Smart Routing System</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Interactive Chat Demo</h2>
          <div ref={scrollRef} className="h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            {messages.length === 0 && <div className="text-center text-gray-500 mt-20">Start a conversation or try a test scenario</div>}
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-4 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-xs p-3 rounded-lg ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>{msg.text}</div>
                {msg.route && <div className="text-xs text-gray-500 mt-1">Route: {msg.route.replace(/_/g, ' ')}</div>}
              </div>
            ))}
            {isTyping && (
              <div className="text-left mb-4"><div className="inline-block bg-white border border-gray-200 p-3 rounded-lg"><div className="flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div></div></div></div>
            )}
          </div>

          {crisisDetected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3"><AlertTriangleIcon /><div><div className="font-medium text-red-900">Crisis Detected</div><div className="text-sm text-red-700">Automatic escalation protocol initiated</div></div></div>
          )}

          {evaluationScore && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"><div className="flex items-center justify-between mb-2"><span className="font-medium text-blue-900">AI Evaluator Score</span><span className="text-2xl font-bold text-blue-600">{evaluationScore.score}%</span></div><div className="grid grid-cols-2 gap-2 text-sm">{Object.entries(evaluationScore.checks).map(([check, passed]) => (<div key={check} className="flex items-center gap-2">{passed ? <CheckCircleIcon /> : <XCircleIcon />}<span className="text-gray-700">{check.replace(/([A-Z])/g, ' $1').trim()}</span></div>))}</div></div>
          )}

          <div className="flex gap-2"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button onClick={handleSend} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Send</button></div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-lg p-6"><h3 className="font-bold text-lg mb-4">Test Scenarios</h3><div className="space-y-3">{testScenarios.map((scenario, idx) => (<TestScenario key={idx} scenario={scenario} onClick={() => { setInput(scenario.text); setTimeout(() => handleSend(), 100); }} />))}</div></div>
          <div className="bg-white rounded-lg shadow-lg p-6"><h3 className="font-bold text-lg mb-4">Logs & Evaluator</h3>{logs.length === 0 ? <div className="text-sm text-gray-600">No logs found. Use the main tracker to add entries.</div> : (<ul>{logs.map((l, i) => (<li key={i} className="mb-3"><div className="text-sm font-medium">{new Date(l.timestamp).toLocaleString()}</div><div className="text-xs text-gray-600">Mood: {l.mood} — {l.note ? l.note.slice(0, 80) : 'no note'}</div><div className="mt-2"><button onClick={() => setSelected(l)} className="mr-2">View</button><button onClick={() => handleEvaluate(l)}>Evaluate</button></div></li>))}</ul>)}</div>
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
          <h3>Selected log</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(selected, null, 2)}</pre>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {response && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: '#fff6ea', border: '1px solid #e8d9c5' }}>
          <h3>Evaluator response {response.fromFallback ? '(local fallback)' : ''}</h3>
          {response.loading ? (
            <div>Loading…</div>
          ) : response.error ? (
            <div style={{ color: 'crimson' }}>Error: {response.error}</div>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(response.data, null, 2)}</pre>
          )}
          {lastError && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: '#b05252' }}>Last network error: {lastError}</div>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => handleEvaluate(selected, { allowFallback: true })} style={{ marginRight: 8 }}>Retry</button>
                <button onClick={() => setResponse({ loading: false, data: localEvaluate(selected), fromFallback: true })}>Use local fallback</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <small>Tip: run the Flask API at <code>http://127.0.0.1:5000</code> to enable remote evaluation. If the API is unreachable, the app will use a safe local fallback evaluator.</small>
      </div>
    </div>
  )
}
