# 🧹 MindFlow Sanctuary - Code Cleanup Plan

## 📊 ACTIVE FILES (Keep - Currently Used)

### **Core Application**
- ✅ `index.html` - Main hub/entry point
- ✅ `unified-sanctuary.html` - Main chat application
- ✅ `style.css` - Main stylesheet
- ✅ `css/accessibility.css` - Accessibility panel styles
- ✅ `js/sanctuary.js` - Chatbot logic
- ✅ `js/accessibility.js` - Accessibility features
- ✅ `js/db-integration.js` - Database integration
- ✅ `server.js` - Backend API server
- ✅ `package.json` - Dependencies
- ✅ `therapists.json` - Therapist data

### **Supporting Pages**
- ✅ `resources.html` - Mental health resources
- ✅ `test-dashboard.html` - API testing dashboard

### **Documentation** (Keep for reference)
- ✅ `README.md`
- ✅ `PROBLEM-RESOLUTION-REPORT.md`
- ✅ `UX-UI-REDESIGN.md`
- ✅ `REDESIGN-SUMMARY.md`
- ✅ `QUICK-START-UX.md`
- ✅ `IMPLEMENTATION-CHECKLIST.md`
- ✅ `.markdownlint.json`

### **Database & Config**
- ✅ `database/schema.sql`
- ✅ `database/DatabaseManager.js`
- ✅ `mindflow_sanctuary.db` - Production database
- ✅ `app.db` - Secondary database

---

## 🗑️ UNUSED/LEGACY FILES (To Remove or Archive)

### **Duplicate/Legacy HTML Pages**
- ❌ `sanctuary.html` - Old version (replaced by unified-sanctuary.html)
- ❌ `welcome.html` - Legacy welcome (not linked from index)
- ❌ `mind-flow-complete.html` - Old version
- ❌ `collaborative-mental-health.html` - Separate system not integrated

### **Legacy JavaScript**
- ❌ `js/collaborative-ai-system.js` - Not used in main app
- ❌ `js/mindflow-clean.js` - Legacy chatbot
- ❌ `js/strict-protocol-chatbot.js` - Old implementation
- ❌ `script.js` - Root level, not referenced

### **Archive Folder** (Already archived, safe to keep)
- ✅ Keep `archive/` folder as-is for reference

### **MVP App** (Separate React app, can keep)
- ✅ Keep `mvp-app/` - Self-contained separate project

### **API Folder** (Python Flask, separate)
- ✅ Keep `api/` - Separate Python API if needed

---

## 🔧 CLEANUP ACTIONS

### **Phase 1: Remove Unused Root HTML Files**
1. Move `sanctuary.html` to archive (old version)
2. Move `welcome.html` to archive (not integrated)
3. Move `mind-flow-complete.html` to archive (legacy)
4. Move `collaborative-mental-health.html` to archive (separate system)

### **Phase 2: Remove Unused JavaScript**
1. Remove `script.js` from root (not referenced)
2. Move `js/collaborative-ai-system.js` to archive
3. Move `js/mindflow-clean.js` to archive
4. Move `js/strict-protocol-chatbot.js` to archive

### **Phase 3: Remove Unused Styles**
1. Check `style-new.css` - if unused, archive it

### **Phase 4: Optimize index.html**
- ✅ Already optimized
- Links only to active pages
- Clean, minimal code

### **Phase 5: Compress & Minify (Optional)**
- Could minify CSS for production
- Could minify JS for production
- Keep readable versions for development

---

## 📁 FINAL STRUCTURE (After Cleanup)

```
mentalhproject/
├── index.html ⭐ (Entry point)
├── unified-sanctuary.html ⭐ (Main app)
├── resources.html
├── test-dashboard.html
├── style.css ⭐
├── server.js ⭐
├── package.json
├── therapists.json
├── css/
│   └── accessibility.css ⭐
├── js/
│   ├── sanctuary.js ⭐
│   ├── accessibility.js ⭐
│   └── db-integration.js ⭐
├── database/
│   ├── schema.sql
│   └── DatabaseManager.js
├── archive/ (all legacy code)
├── mvp-app/ (separate React app)
├── api/ (Python Flask API)
└── docs/ (markdown files)
```

---

## 🎯 BENEFITS

1. **Cleaner Structure**: Only active files in root
2. **Faster Loading**: No unused code
3. **Easier Maintenance**: Clear what's in use
4. **Better Performance**: Smaller codebase
5. **Less Confusion**: No duplicate files

---

**Recommendation**: Start with Phase 1 & 2 to move legacy files to archive.
