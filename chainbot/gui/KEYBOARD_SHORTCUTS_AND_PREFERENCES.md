# Keyboard Shortcuts & Preferences System

## Overview

The ChainBot GUI now includes a comprehensive keyboard shortcuts system and user preferences management, providing a professional and customizable user experience.

## Keyboard Shortcuts

### Navigation Shortcuts
- **Ctrl+K** - Open Command Palette
- **Ctrl+B** - Toggle Sidebar
- **Ctrl+1** - Switch to Chat
- **Ctrl+2** - Switch to Code
- **Ctrl+3** - Switch to Agents
- **Ctrl+4** - Switch to Memory
- **Ctrl+5** - Switch to Workflows
- **Escape** - Close all modals

### Action Shortcuts
- **Ctrl+N** - New Chat
- **Ctrl+S** - Save (context-aware)

### Tool Shortcuts
- **Ctrl+P** - Open Plugin Manager
- **F2** - Open Plugin Manager (alternative)

### System Shortcuts
- **Ctrl+,** - Open Preferences
- **F1** - Open Preferences (alternative)
- **Ctrl+?** - Show Keyboard Shortcuts Help

## User Preferences System

### Features
- **Persistent Storage**: All preferences are automatically saved to localStorage
- **Import/Export**: Users can backup and restore their preferences
- **Reset Options**: Reset to defaults or clear all preferences
- **Real-time Updates**: Changes apply immediately

### Preference Categories

#### Appearance
- **Theme**: Dark, Light, or Auto (system-based)
- **Accent Color**: 6 predefined color options
- **Font Size**: Small, Medium, Large
- **Compact Mode**: Toggle for space-efficient layout

#### Keyboard
- **Enable/Disable**: Toggle keyboard shortcuts globally
- **Custom Shortcuts**: User-defined shortcuts (future feature)
- **Shortcut Categories**: Navigation, Actions, Tools, System

#### Layout
- **Panel Layout**: Default, Compact, Expanded
- **Sidebar Collapsed**: Remember sidebar state
- **Auto-save**: Enable/disable with configurable interval

#### Chat & AI
- **Default Model**: GPT-4, GPT-3.5 Turbo, Claude-3, Gemini Pro
- **Max Tokens**: 100-8000 range
- **Temperature**: 0-2 range with visual indicators
- **Auto-scroll**: Auto-scroll to new messages
- **Show Timestamps**: Display message timestamps

#### Code Editor
- **Editor Theme**: VS Dark, VS Light, High Contrast Black
- **Line Numbers**: Show/hide line numbers
- **Word Wrap**: Enable/disable word wrapping
- **Tab Size**: 2-8 spaces
- **Insert Spaces**: Use spaces instead of tabs

#### Notifications
- **Enable Notifications**: Toggle all notifications
- **Sound Notifications**: Enable/disable sound alerts
- **Desktop Notifications**: System-level notifications

#### Privacy & Data
- **Analytics**: Enable usage analytics
- **Telemetry**: Enable telemetry data collection
- **Auto-update**: Automatic updates

#### Performance
- **Hardware Acceleration**: Enable GPU acceleration
- **Low Power Mode**: Reduce resource usage

## Implementation Details

### Architecture

#### Preferences Context (`PreferencesContext.tsx`)
```typescript
interface UserPreferences {
  // Theme and appearance
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  
  // Layout preferences
  sidebarCollapsed: boolean;
  panelLayout: 'default' | 'compact' | 'expanded';
  autoSave: boolean;
  autoSaveInterval: number;
  
  // Keyboard shortcuts
  keyboardShortcutsEnabled: boolean;
  customShortcuts: Record<string, string>;
  
  // ... and more
}
```

#### Keyboard Shortcuts Hook (`useKeyboardShortcuts.ts`)
```typescript
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'tools' | 'system';
}
```

### Components

#### Preferences Panel (`PreferencesPanel.tsx`)
- Tabbed interface for organized settings
- Real-time validation and feedback
- Import/export functionality
- Reset options

#### Keyboard Shortcuts Help (`KeyboardShortcutsHelp.tsx`)
- Searchable shortcuts list
- Category filtering
- Visual key combination display
- Integration with preferences

### Integration Points

#### App.tsx Integration
```typescript
const App: React.FC = () => {
  return (
    <PreferencesProvider>
      <AnalyticsProvider>
        <ModelProvider>
          <PluginProvider>
            <WorkflowProvider>
              <SuggestionsProvider>
                <AppContent />
              </SuggestionsProvider>
            </WorkflowProvider>
          </PluginProvider>
        </ModelProvider>
      </AnalyticsProvider>
    </PreferencesProvider>
  );
};
```

#### Keyboard Shortcuts Setup
```typescript
const shortcuts: KeyboardShortcut[] = [
  {
    key: 'k',
    ctrlKey: true,
    action: () => setShowCommandPalette(true),
    description: 'Open Command Palette',
    category: 'navigation'
  },
  // ... more shortcuts
];

useKeyboardShortcuts({
  shortcuts,
  enabled: preferences.keyboardShortcutsEnabled
});
```

## Best Practices

### Keyboard Shortcuts
1. **Consistent Modifiers**: Use Ctrl for primary actions, Ctrl+Shift for alternatives
2. **Intuitive Keys**: Choose keys that relate to the action (K for Command, P for Plugin)
3. **Conflict Avoidance**: Check for conflicts with browser shortcuts
4. **Accessibility**: Provide alternative access methods (F1, F2 keys)

### Preferences
1. **Sensible Defaults**: Start with user-friendly default values
2. **Immediate Feedback**: Apply changes instantly when possible
3. **Data Persistence**: Always save to localStorage with error handling
4. **Import/Export**: Allow users to backup and restore settings

### UI/UX
1. **Visual Hierarchy**: Organize settings logically with clear categories
2. **Tooltips**: Show keyboard shortcuts in tooltips
3. **Search**: Provide search functionality for large preference sets
4. **Validation**: Real-time validation with helpful error messages

## Future Enhancements

### Planned Features
- **Custom Shortcuts**: Allow users to define their own shortcuts
- **Shortcut Conflicts**: Detection and resolution of conflicting shortcuts
- **Profile System**: Multiple preference profiles for different use cases
- **Cloud Sync**: Sync preferences across devices
- **Advanced Themes**: Custom theme creation and sharing

### Technical Improvements
- **Performance**: Optimize preference updates for large datasets
- **Validation**: Enhanced validation with custom rules
- **Migration**: Automatic migration of old preference formats
- **Analytics**: Track preference usage for UX improvements

## Usage Examples

### Adding a New Shortcut
```typescript
const newShortcut: KeyboardShortcut = {
  key: 'r',
  ctrlKey: true,
  action: () => refreshData(),
  description: 'Refresh Data',
  category: 'actions'
};

shortcuts.push(newShortcut);
```

### Adding a New Preference
```typescript
// In PreferencesContext.tsx
interface UserPreferences {
  // ... existing preferences
  newFeature: boolean;
}

const defaultPreferences: UserPreferences = {
  // ... existing defaults
  newFeature: false,
};

// In PreferencesPanel.tsx
<div className="flex items-center space-x-3">
  <input
    type="checkbox"
    id="newFeature"
    checked={preferences.newFeature}
    onChange={(e) => updatePreference('newFeature', e.target.checked)}
    className="rounded border-gray-600 bg-[#23232a] text-blue-500"
  />
  <label htmlFor="newFeature" className="text-sm text-gray-300">
    Enable New Feature
  </label>
</div>
```

## Troubleshooting

### Common Issues
1. **Shortcuts Not Working**: Check if keyboard shortcuts are enabled in preferences
2. **Preferences Not Saving**: Verify localStorage is available and not full
3. **Import Errors**: Ensure JSON format matches expected structure
4. **Performance Issues**: Consider disabling analytics or telemetry

### Debug Mode
Enable debug logging by setting `localStorage.setItem('chainbot-debug', 'true')` to see detailed preference and shortcut events in the console.

## Conclusion

The keyboard shortcuts and preferences system provides a solid foundation for a professional, user-friendly interface. The modular architecture allows for easy extension and customization while maintaining consistency and accessibility standards. 