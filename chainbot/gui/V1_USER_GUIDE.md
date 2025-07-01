# ChainBot GUI v1 User Guide

## 🚀 **Getting Started**

**Development Server:** http://localhost:5173  
**Status:** ✅ **FULLY FUNCTIONAL**

---

## 🎯 **Quick Start Guide**

### **1. Access the Application**
- Open your browser and navigate to: `http://localhost:5173`
- You'll see the main ChainBot GUI interface with three main tabs:
  - **Chat** - AI conversations
  - **Code** - File editor
  - **Watchtower** - System monitoring

### **2. Test Chat Functionality**

#### **First Time Setup:**
1. Click on the **Chat** tab
2. You'll see a "No API Key" status indicator
3. Click the **Settings** button (gear icon) in the top-right
4. Enter your ChatGPT API key from [OpenAI Platform](https://platform.openai.com/api-keys)
5. Click **Save Key** and then **Test Key**
6. Once validated, you'll see "Connected" status

#### **Start Chatting:**
1. Type a message in the input field
2. Press Enter or click the Send button
3. Watch the AI respond in real-time
4. Your conversation history is automatically saved

#### **Chat Features:**
- **Export Chat:** Download conversation as JSON
- **Import Chat:** Load previous conversations
- **Clear Chat:** Start fresh conversation
- **Settings:** Manage API key and preferences

### **3. Test Code Editor**

#### **File Management:**
1. Click on the **Code** tab
2. You'll see a file tree on the left with example files
3. Click on any file to open it in the editor
4. Make changes - they auto-save after 1 second

#### **Create New Files:**
1. Click the **+** button in the file tree
2. Choose file or folder type
3. Enter name and location
4. Click **Create**

#### **Code Editor Features:**
- **Multi-tab Interface:** Open multiple files
- **Auto-save:** Changes saved automatically
- **File Tree:** Navigate and organize files
- **Export/Import:** Backup and restore projects
- **Language Detection:** Automatic syntax highlighting

### **4. Test Watchtower**

#### **System Monitoring:**
1. Click on the **Watchtower** tab
2. View real-time system data
3. Monitor agent status and blockchain information
4. Check system health metrics

---

## 🔧 **Advanced Features**

### **Layout Management**
- **Resize Windows:** Drag window borders to resize
- **Custom Layouts:** Arrange windows as needed
- **Layout Persistence:** Your layout is saved automatically

### **Theme Switching**
- **Dark/Light Mode:** Toggle between themes
- **Custom Themes:** Create your own color schemes
- **Theme Persistence:** Your preference is remembered

### **Auto-Save & Backup**
- **Real-time Saving:** All changes saved automatically
- **Undo/Redo:** Use Ctrl+Z and Ctrl+Y
- **Backup System:** Automatic version history
- **Export Data:** Download all your data

---

## 📁 **File Structure**

### **Default Files Included:**
```
/
├── welcome.md          # Welcome guide
└── examples/
    ├── hello.js        # JavaScript example
    └── hello.py        # Python example
```

### **Supported File Types:**
- **JavaScript/TypeScript:** .js, .ts, .jsx, .tsx
- **Python:** .py
- **Web:** .html, .css
- **Data:** .json, .xml, .yaml
- **Documentation:** .md, .txt
- **And more!**

---

## 🔑 **API Key Setup**

### **Getting Your ChatGPT API Key:**
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **Create new secret key**
4. Copy the key (starts with `sk-`)
5. Paste it in ChainBot GUI settings

### **Security Notes:**
- Your API key is stored locally in your browser
- It's never sent to our servers
- You can change or remove it anytime
- The key is validated before use

---

## 💾 **Data Management**

### **What Gets Saved:**
- **Chat History:** All conversations
- **File Content:** All your code files
- **Settings:** API keys, themes, layouts
- **Recent Files:** Quick access to recent work

### **Export Options:**
- **Chat Export:** Download conversations as JSON
- **File Export:** Download entire file tree
- **Settings Export:** Backup all preferences

### **Import Options:**
- **Chat Import:** Load previous conversations
- **File Import:** Restore file projects
- **Settings Import:** Restore preferences

---

## 🐛 **Troubleshooting**

### **Common Issues:**

#### **Chat Not Working:**
- **Problem:** "No API Key" status
- **Solution:** Configure your ChatGPT API key in settings

#### **API Key Invalid:**
- **Problem:** "Invalid API key" error
- **Solution:** Check your key at OpenAI Platform and regenerate if needed

#### **Files Not Saving:**
- **Problem:** Changes not persisting
- **Solution:** Check browser storage permissions and clear cache if needed

#### **Slow Performance:**
- **Problem:** Application feels sluggish
- **Solution:** Close unused file tabs and clear old chat history

### **Browser Compatibility:**
- **Chrome:** ✅ Full support
- **Firefox:** ✅ Full support
- **Safari:** ✅ Full support
- **Edge:** ✅ Full support

---

## 🎯 **Testing Checklist**

### **Core Functionality:**
- [ ] **Chat:** Configure API key and send messages
- [ ] **Code:** Create, edit, and save files
- [ ] **Watchtower:** View system data
- [ ] **Layout:** Resize and arrange windows
- [ ] **Themes:** Switch between dark/light modes

### **Advanced Features:**
- [ ] **Auto-save:** Verify changes are saved automatically
- [ ] **Export/Import:** Test data portability
- [ ] **File Operations:** Create, delete, rename files
- [ ] **Multi-tab:** Open and switch between multiple files
- [ ] **Error Handling:** Test with invalid API key

### **User Experience:**
- [ ] **Responsive Design:** Test on different screen sizes
- [ ] **Performance:** Verify smooth operation
- [ ] **Accessibility:** Test keyboard navigation
- [ ] **Data Persistence:** Verify data survives page refresh

---

## 📞 **Support & Feedback**

### **Getting Help:**
- **Documentation:** Check this guide first
- **Issues:** Report bugs with detailed descriptions
- **Feature Requests:** Suggest improvements
- **Questions:** Ask in the community

### **Providing Feedback:**
- **What Works Well:** Share positive experiences
- **What Needs Improvement:** Report issues or suggestions
- **Performance Issues:** Include system details
- **Feature Requests:** Describe use cases

---

## 🚀 **What's Next**

### **v1.1 Enhancements:**
- Advanced syntax highlighting
- Code completion and IntelliSense
- File attachments in chat
- Real-time collaboration features

### **v1.2 Features:**
- Plugin system for extensions
- Advanced AI code generation
- Git integration
- Cloud file storage

### **v2.0 Roadmap:**
- Multi-platform support (Windows, Linux)
- Enterprise features
- Team collaboration
- Advanced security features

---

**Happy Testing! 🎉**

Your feedback helps make ChainBot GUI even better. Enjoy exploring the fully functional v1 prototype! 