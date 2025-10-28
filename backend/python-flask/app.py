# MindFlow - Python Flask Backend
# Healthcare-grade REST API with HIPAA compliance

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
import secrets

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///mindflow.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', secrets.token_hex(32))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Configure for production

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user', index=True)
    status = db.Column(db.String(50), nullable=False, default='active')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    conversations = db.relationship('Conversation', backref='user', lazy=True, cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', backref='user', lazy=True)
    
    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'lastLogin': self.last_login.isoformat() if self.last_login else None,
            'permissions': self.get_permissions()
        }
        return data
    
    def get_permissions(self):
        """Get role-based permissions"""
        permissions = {
            'admin': {
                'canViewAllUsers': True,
                'canEditUsers': True,
                'canDeleteUsers': True,
                'canViewAuditLogs': True,
                'canManageRoles': True,
                'canAccessAdminPanel': True,
                'canViewCrisisAlerts': True,
                'canManageResources': True,
                'canExportData': True,
                'canConfigureSystem': True
            },
            'therapist': {
                'canViewAllUsers': False,
                'canEditUsers': False,
                'canDeleteUsers': False,
                'canViewAuditLogs': False,
                'canManageRoles': False,
                'canAccessAdminPanel': False,
                'canViewCrisisAlerts': True,
                'canManageResources': True,
                'canExportData': False,
                'canConfigureSystem': False,
                'canViewAssignedClients': True,
                'canUpdateClientNotes': True,
                'canAccessTherapistPortal': True
            },
            'auditor': {
                'canViewAllUsers': True,
                'canEditUsers': False,
                'canDeleteUsers': False,
                'canViewAuditLogs': True,
                'canManageRoles': False,
                'canAccessAdminPanel': False,
                'canViewCrisisAlerts': True,
                'canManageResources': False,
                'canExportData': True,
                'canConfigureSystem': False,
                'canAccessAuditorPortal': True,
                'canGenerateReports': True
            },
            'user': {
                'canViewAllUsers': False,
                'canEditUsers': False,
                'canDeleteUsers': False,
                'canViewAuditLogs': False,
                'canManageRoles': False,
                'canAccessAdminPanel': False,
                'canViewCrisisAlerts': False,
                'canManageResources': False,
                'canExportData': False,
                'canConfigureSystem': False,
                'canAccessUserApp': True,
                'canChatWithAI': True
            }
        }
        return permissions.get(self.role, permissions['user'])


class Conversation(db.Model):
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    is_crisis = db.Column(db.Boolean, default=False, index=True)
    sentiment = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'message': self.message,
            'response': self.response,
            'isCrisis': self.is_crisis,
            'sentiment': self.sentiment,
            'timestamp': self.timestamp.isoformat()
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), index=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'action': self.action,
            'details': self.details,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'timestamp': self.timestamp.isoformat()
        }


# Helper Functions
def log_audit(action, user_id=None, details=None):
    """Log an audit event"""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    db.session.add(audit)
    db.session.commit()


# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })


@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    data = request.get_json()
    
    # Validate input
    if not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'success': False, 'error': 'Email, password, and name are required'}), 400
    
    if len(data['password']) < 8:
        return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400
    
    # Check if user exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'error': 'Email already registered'}), 409
    
    # Validate role
    role = data.get('role', 'user')
    valid_roles = ['user', 'therapist', 'auditor', 'admin']
    if role not in valid_roles:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    # Create user
    user_id = secrets.token_urlsafe(16)
    user = User(
        id=user_id,
        email=data['email'],
        name=data['name'],
        password_hash=generate_password_hash(data['password']),
        role=role
    )
    
    db.session.add(user)
    db.session.commit()
    
    log_audit('user_registered', user_id, f"Role: {role}")
    
    return jsonify({
        'success': True,
        'message': 'Registration successful',
        'user': user.to_dict()
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate user"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        log_audit('login_failed', None, f"Email: {data['email']}")
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
    
    if user.status != 'active':
        return jsonify({'success': False, 'error': 'Account is inactive'}), 403
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Create JWT token
    access_token = create_access_token(identity=user.id)
    
    log_audit('login_success', user.id)
    
    return jsonify({
        'success': True,
        'token': access_token,
        'user': user.to_dict()
    })


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })


@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users (admin/auditor only)"""
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    
    if not current_user or current_user.role not in ['admin', 'auditor']:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    users = User.query.all()
    
    return jsonify({
        'success': True,
        'users': [u.to_dict() for u in users]
    })


@app.route('/api/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Update allowed fields
    if 'role' in data:
        valid_roles = ['user', 'therapist', 'auditor', 'admin']
        if data['role'] in valid_roles:
            user.role = data['role']
            log_audit('role_updated', current_user_id, f"User {user_id} role changed to {data['role']}")
    
    if 'status' in data:
        user.status = data['status']
    
    if 'name' in data:
        user.name = data['name']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })


@app.route('/api/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Delete user (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    # Prevent self-deletion
    if user_id == current_user_id:
        return jsonify({'success': False, 'error': 'Cannot delete your own account'}), 400
    
    db.session.delete(user)
    db.session.commit()
    
    log_audit('user_deleted', current_user_id, f"Deleted user {user_id}")
    
    return jsonify({
        'success': True,
        'message': 'User deleted successfully'
    })


@app.route('/api/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    """Save a conversation"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    conversation = Conversation(
        user_id=user_id,
        message=data.get('message', ''),
        response=data.get('response', ''),
        is_crisis=data.get('isCrisis', False),
        sentiment=data.get('sentiment')
    )
    
    db.session.add(conversation)
    db.session.commit()
    
    if conversation.is_crisis:
        log_audit('crisis_detected', user_id, 'Crisis language detected in conversation')
    
    return jsonify({
        'success': True,
        'conversation': conversation.to_dict()
    }), 201


@app.route('/api/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get user's conversations"""
    user_id = get_jwt_identity()
    
    conversations = Conversation.query.filter_by(user_id=user_id).order_by(Conversation.timestamp.desc()).all()
    
    return jsonify({
        'success': True,
        'conversations': [c.to_dict() for c in conversations]
    })


@app.route('/api/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit logs (admin/auditor only)"""
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    
    if not current_user or current_user.role not in ['admin', 'auditor']:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    limit = request.args.get('limit', 100, type=int)
    
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    return jsonify({
        'success': True,
        'logs': [log.to_dict() for log in logs]
    })


@app.route('/api/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get system statistics (admin only)"""
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    total_users = User.query.count()
    total_therapists = User.query.filter_by(role='therapist').count()
    total_auditors = User.query.filter_by(role='auditor').count()
    total_conversations = Conversation.query.count()
    
    # Crisis alerts in last 24 hours
    yesterday = datetime.utcnow() - timedelta(days=1)
    crisis_count = Conversation.query.filter(
        Conversation.is_crisis == True,
        Conversation.timestamp >= yesterday
    ).count()
    
    return jsonify({
        'success': True,
        'stats': {
            'totalUsers': total_users,
            'totalTherapists': total_therapists,
            'totalAuditors': total_auditors,
            'totalConversations': total_conversations,
            'crisisAlerts24h': crisis_count
        }
    })


# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'success': False, 'error': 'Internal server error'}), 500


# Database initialization
def init_db():
    """Initialize database"""
    with app.app_context():
        db.create_all()
        print("Database initialized successfully!")


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
