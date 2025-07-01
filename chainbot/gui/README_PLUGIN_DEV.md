# Plugin Development Kit (PDK) Quickstart

Welcome to the ChainBot GUI Plugin Development Kit! This guide will help you quickly scaffold, develop, and test plugins for the ChainBot GUI platform.

---

## 🚀 Quickstart: Create a New Plugin

1. **Run the Plugin Scaffold Script:**
   ```sh
   npm run create-plugin MyAwesomePlugin
   ```
   This will create a new folder in `src/components/PluginMarketplace/plugins/MyAwesomePlugin` with a best-practices template.

2. **Edit Your Plugin:**
   - Open `index.tsx` to implement your plugin UI and logic.
   - Edit `manifest.json` to update metadata, dependencies, and permissions.

3. **Test Your Plugin:**
   - Start the development server: `npm run dev`
   - Your plugin will appear in the Plugin Manager and Marketplace.

4. **Iterate:**
   - Hot-reload is supported for plugin UI changes.
   - Use the Plugin Manager to enable/disable and configure your plugin.

---

## 📦 Plugin Structure

```
MyAwesomePlugin/
  ├── index.tsx        # Main plugin component (React)
  └── manifest.json    # Plugin metadata and config
```

### `manifest.json` Example
```json
{
  "name": "MyAwesomePlugin",
  "version": "0.1.0",
  "description": "A new plugin for ChainBot GUI.",
  "author": "Your Name",
  "type": "tool",
  "entryPoint": "./index.tsx",
  "dependencies": [],
  "permissions": []
}
```

---

## 🛠️ Best Practices

- **Keep UI simple and accessible.**
- **Document your code and usage.**
- **Use semantic versioning** for releases.
- **Declare all dependencies and permissions** in `manifest.json`.
- **Handle errors gracefully** and provide user feedback.
- **Test your plugin** in the Plugin Manager before publishing.
- **Avoid side effects** outside your plugin's scope.

---

## 🧩 Plugin Types
- `panel`: Adds a new UI panel
- `tool`: Provides a utility or tool
- `workflow`: Automates a sequence of actions
- `theme`: Customizes the UI appearance
- `integration`: Connects to external services

---

## 🐞 Debugging Plugins
- Errors in plugins will appear in the Plugin Manager and browser console.
- Use `console.log` for debugging output.
- If your plugin fails to load, check the manifest and entry point.

---

## 📚 Further Reading
- See the main project README for API and context usage.
- Explore example plugins in the `plugins/` directory.
- For advanced features, see the Plugin Ecosystem documentation.

---

Happy hacking! 🚀 