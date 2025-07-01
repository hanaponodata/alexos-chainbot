import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check, Sparkles, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
  isLast?: boolean;
  isTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  timestamp,
  agent,
  isLast = false,
  isTyping = false
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const messageVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  const bubbleVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
    >
      <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <motion.div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser 
              ? 'bg-[#23232a] text-white' 
              : 'bg-[#18181b] text-white'
          }`}
          variants={bubbleVariants}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </motion.div>

        {/* Message Content */}
        <motion.div
          className={`relative group max-w-full ${
            isUser ? 'order-1' : 'order-2'
          }`}
          variants={bubbleVariants}
        >
          {/* Message Bubble */}
          <div className={`
            relative rounded-2xl px-4 py-3 border shadow
            ${isUser 
              ? 'bg-[#23232a] border-[#23232a] text-white' 
              : 'bg-[#18181b] border-[#18181b] text-white'
            }
            ${isTyping ? 'animate-pulse' : ''}
          `}>
            {/* Message Header */}
            <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs font-medium opacity-80">
                {isUser ? 'You' : agent || 'ChainBot'}
              </span>
              <div className="flex items-center gap-1 text-xs opacity-60">
                <Clock className="w-3 h-3" />
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Message Body */}
            <div className="prose prose-sm max-w-none text-white">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content}
              </ReactMarkdown>
            </div>

            {isTyping && (
              <motion.div
                className="flex items-center gap-2 mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-sm text-gray-400">ChainBot is thinking...</span>
                </div>
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-emerald-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-emerald-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-emerald-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Message Actions */}
          <motion.div
            className={`absolute top-2 ${isUser ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-all duration-200`}
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-[#23232a] border border-[#23232a] hover:bg-[#23232a]/80 transition-all duration-200"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-gray-300" />
              )}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ChatMessage; 