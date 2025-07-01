#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLUGIN_DIR = path.join(__dirname, '../src/components/PluginMarketplace/plugins');

const [,, pluginName] = process.argv;

if (!pluginName) {
  console.error('Usage: npm run create-plugin <PluginName>');
  process.exit(1);
}

const pluginFolder = path.join(PLUGIN_DIR, pluginName);
if (fs.existsSync(pluginFolder)) {
  console.error(`Plugin '${pluginName}' already exists.`);
  process.exit(1);
}

fs.mkdirSync(pluginFolder, { recursive: true });

const indexTsx = `import React from 'react';

/**
 * ${pluginName} Plugin
 *
 * This is a best-practices plugin template. Edit as needed!
 */
const ${pluginName} = () => {
  return (
    <div>
      <h2>${pluginName} Plugin</h2>
      <p>Edit this file to implement your plugin UI and logic.</p>
    </div>
  );
};

export default ${pluginName};
`;

const manifestJson = `{
  "name": "${pluginName}",
  "version": "0.1.0",
  "description": "A new plugin for ChainBot GUI.",
  "author": "Your Name",
  "type": "tool",
  "entryPoint": "./index.tsx",
  "dependencies": [],
  "permissions": []
}
`;

fs.writeFileSync(path.join(pluginFolder, 'index.tsx'), indexTsx);
fs.writeFileSync(path.join(pluginFolder, 'manifest.json'), manifestJson);

console.log(`✅ Plugin '${pluginName}' scaffolded at ${pluginFolder}`); 