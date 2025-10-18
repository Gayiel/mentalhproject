# Security & Data Protection Notice

## 🔒 SENSITIVE DATA PROTECTION

This mental health platform handles **HIPAA-sensitive information** and requires strict data protection measures.

### 📋 Protected Files (Not in Git)

#### Database Files
- `*.db`, `*.sqlite`, `*.sqlite3`
- `app.db*`, `mindflow_sanctuary.db`
- `user_data/`, `conversations/`, `session_data/`

#### Professional Data
- `therapists.json` - Contains licensed professional information
- `counselors.json` - Staff directory
- `professional_directory/` - Provider databases

#### User Content
- `uploads/`, `user_uploads/`
- `recordings/`, `audio/sessions/`
- `documents/`, `attachments/`

#### Configuration & Security
- `.env*` files - Environment variables
- `config*.json` - Configuration files
- `certificates/`, `keys/`, `auth/`
- All log files (`*.log`)

### 🛡️ Development Guidelines

1. **Never commit real patient data**
2. **Use example/mock data for development**
3. **Keep production databases local only**
4. **Regularly audit git history for leaks**
5. **Use encrypted storage for backups**

### 📝 Example Files Provided

- `therapists.json.example` - Template for therapist directory
- Use these examples to set up local development

### ⚠️ HIPAA Compliance

This platform must maintain HIPAA compliance:
- All user data encrypted
- Access logs maintained
- Regular security audits
- Staff training on data protection

### 🚨 Security Incident Response

If sensitive data is accidentally committed:
1. **Stop immediately**
2. Remove from git history (`git filter-branch`)
3. Force push to all remotes
4. Notify security team
5. Document incident

---

**Remember: Patient privacy and data security are paramount. When in doubt, don't commit.**
