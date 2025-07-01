import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Smile, Sparkles, ArrowUp } from 'lucide-react';
import Button from './Button';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onAttachment?: (file: File) => void;
  onEmoji?: (emoji: string) => void;
  className?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = "Message ChainBot...",
  disabled = false,
  onAttachment,
  onEmoji,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSend();
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !isLoading && !disabled) {
      onSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachment) {
      onAttachment(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (onEmoji) {
      onEmoji(emoji);
    }
    setShowEmojiPicker(false);
  };

  const commonEmojis = ['😊', '👍', '🎉', '🔥', '💡', '🚀', '✨', '💯', '👏', '❤️'];

  return (
    <div className={`relative ${className}`}>
      {/* Main Input Container */}
      <motion.div
        className={`flex items-end gap-2 w-full p-3 bg-[#18181b] rounded-2xl border border-[#23232a] shadow`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        {/* Input Area */}
        <div className="flex items-end gap-2 p-3">
          {/* Attachment Button */}
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 text-gray-300" />
          </motion.button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.txt,.md,.js,.ts,.py,.json"
          />

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-gray-400 text-sm leading-relaxed"
              rows={1}
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
          </div>

          {/* Emoji Button */}
          <motion.button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Add emoji"
          >
            <Smile className="w-4 h-4 text-gray-300" />
          </motion.button>

          {/* Send Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={handleSend}
              disabled={!value.trim() || isLoading || disabled}
              loading={isLoading}
              size="sm"
              className={`
                ${value.trim() && !isLoading && !disabled
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gray-600/50 cursor-not-allowed'
                }
                transition-all duration-200
              `}
            >
              {isLoading ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full mb-2 left-0 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl"
          >
            <div className="grid grid-cols-5 gap-2">
              {commonEmojis.map((emoji, index) => (
                <motion.button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors duration-200 text-lg"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut hint */}
      <div className="absolute -bottom-6 left-0 text-xs text-gray-500 flex items-center gap-2">
        <span>Press Enter to send</span>
        <span>•</span>
        <span>Shift + Enter for new line</span>
      </div>
    </div>
  );
};

export default ChatInput; 