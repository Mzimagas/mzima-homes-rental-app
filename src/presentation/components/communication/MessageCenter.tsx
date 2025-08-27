/**
 * Message Center Component
 * Central hub for in-app messaging and communication
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useRealtimeStore } from '../../stores/realtimeStore'
import { useUIStore } from '../../stores/uiStore'

interface Message {
  id: string
  fromUserId: string
  toUserId: string
  subject: string
  content: string
  timestamp: Date
  isRead: boolean
  messageType: 'general' | 'maintenance' | 'payment' | 'lease'
  relatedEntityId?: string
  attachments?: MessageAttachment[]
}

interface MessageAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

interface MessageThread {
  id: string
  participants: string[]
  subject: string
  lastMessage: Message
  messageCount: number
  unreadCount: number
  isArchived: boolean
}

export function MessageCenter() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'archived'>('inbox')
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const { notifications, unreadCount } = useRealtimeStore()
  const { addNotification } = useUIStore()

  // Mock data - in real implementation, this would come from API/store
  const [threads, setThreads] = useState<MessageThread[]>([
    {
      id: 'thread_1',
      participants: ['landlord_1', 'tenant_1'],
      subject: 'Maintenance Request - Kitchen Sink',
      lastMessage: {
        id: 'msg_1',
        fromUserId: 'tenant_1',
        toUserId: 'landlord_1',
        subject: 'Maintenance Request - Kitchen Sink',
        content: 'The kitchen sink is leaking and needs immediate attention.',
        timestamp: new Date(),
        isRead: false,
        messageType: 'maintenance',
        relatedEntityId: 'maintenance_req_1'
      },
      messageCount: 3,
      unreadCount: 1,
      isArchived: false
    }
  ])

  const [messages, setMessages] = useState<Message[]>([])

  const filteredThreads = threads.filter(thread => {
    if (activeTab === 'archived') return thread.isArchived
    if (activeTab === 'sent') return true // Filter by sent messages
    return !thread.isArchived // inbox
  }).filter(thread => 
    searchTerm === '' || 
    thread.subject.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSendMessage = (messageData: {
    toUserId: string
    subject: string
    content: string
    messageType: Message['messageType']
    relatedEntityId?: string
  }) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      fromUserId: 'current_user',
      ...messageData,
      timestamp: new Date(),
      isRead: false
    }

    // Add to messages
    setMessages(prev => [...prev, newMessage])

    // Update or create thread
    const existingThread = threads.find(t => 
      t.participants.includes(messageData.toUserId)
    )

    if (existingThread) {
      setThreads(prev => prev.map(t => 
        t.id === existingThread.id 
          ? { ...t, lastMessage: newMessage, messageCount: t.messageCount + 1 }
          : t
      ))
    } else {
      const newThread: MessageThread = {
        id: `thread_${Date.now()}`,
        participants: ['current_user', messageData.toUserId],
        subject: messageData.subject,
        lastMessage: newMessage,
        messageCount: 1,
        unreadCount: 0,
        isArchived: false
      }
      setThreads(prev => [...prev, newThread])
    }

    setIsComposing(false)
    addNotification({
      type: 'success',
      title: 'Message Sent',
      message: 'Your message has been sent successfully'
    })
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow-sm border">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <button
              onClick={() => setIsComposing(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
            >
              Compose
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['inbox', 'sent', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'inbox' && unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setSelectedThread(thread.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedThread === thread.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <h3 className={`text-sm font-medium truncate ${
                      thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {thread.subject}
                    </h3>
                    {thread.unreadCount > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {thread.lastMessage.content}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      thread.lastMessage.messageType === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                      thread.lastMessage.messageType === 'payment' ? 'bg-green-100 text-green-800' :
                      thread.lastMessage.messageType === 'lease' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {thread.lastMessage.messageType}
                    </span>
                    <span className="ml-2">
                      {thread.lastMessage.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredThreads.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4-4-4m0 0L9 9l-4-4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No messages match your search.' : 'Start a conversation by composing a new message.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <MessageThread threadId={selectedThread} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a conversation</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a message thread from the sidebar to view the conversation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {isComposing && (
        <ComposeMessageModal
          onSend={handleSendMessage}
          onClose={() => setIsComposing(false)}
        />
      )}
    </div>
  )
}

// Message Thread Component
function MessageThread({ threadId }: { threadId: string }) {
  const [replyContent, setReplyContent] = useState('')

  // Mock messages for the thread
  const threadMessages: Message[] = [
    {
      id: 'msg_1',
      fromUserId: 'tenant_1',
      toUserId: 'landlord_1',
      subject: 'Maintenance Request - Kitchen Sink',
      content: 'The kitchen sink is leaking and needs immediate attention. Water is dripping constantly.',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      isRead: true,
      messageType: 'maintenance',
      relatedEntityId: 'maintenance_req_1'
    },
    {
      id: 'msg_2',
      fromUserId: 'landlord_1',
      toUserId: 'tenant_1',
      subject: 'Re: Maintenance Request - Kitchen Sink',
      content: 'Thank you for reporting this. I will send a plumber tomorrow morning between 9-11 AM.',
      timestamp: new Date(Date.now() - 43200000), // 12 hours ago
      isRead: true,
      messageType: 'maintenance',
      relatedEntityId: 'maintenance_req_1'
    }
  ]

  const handleSendReply = () => {
    if (replyContent.trim()) {
      // Handle reply sending
      setReplyContent('')
    }
  }

  return (
    <>
      {/* Thread Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900">
          Maintenance Request - Kitchen Sink
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Conversation with John Doe • 2 messages
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {threadMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.fromUserId === 'current_user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.fromUserId === 'current_user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.fromUserId === 'current_user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Box */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <button
            onClick={handleSendReply}
            disabled={!replyContent.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}

// Compose Message Modal
function ComposeMessageModal({ 
  onSend, 
  onClose 
}: { 
  onSend: (data: any) => void
  onClose: () => void 
}) {
  const [formData, setFormData] = useState({
    toUserId: '',
    subject: '',
    content: '',
    messageType: 'general' as Message['messageType']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.toUserId && formData.subject && formData.content) {
      onSend(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Compose Message</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <select
              value={formData.toUserId}
              onChange={(e) => setFormData(prev => ({ ...prev, toUserId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select recipient...</option>
              <option value="tenant_1">John Doe (Tenant)</option>
              <option value="landlord_1">Jane Smith (Landlord)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.messageType}
              onChange={(e) => setFormData(prev => ({ ...prev, messageType: e.target.value as Message['messageType'] }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General</option>
              <option value="maintenance">Maintenance</option>
              <option value="payment">Payment</option>
              <option value="lease">Lease</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
