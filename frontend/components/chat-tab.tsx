"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, User, Bot, MessageCircle, Menu, X, Plus, Clock, FileText } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  session_id?: string
}

interface ChatResponse {
  message: Message
  session_id: string
  is_complete: boolean
}

interface ChatSession {
  id: string
  name: string
  messages: Message[]
  created: string
}

const API_BASE = "http://localhost:8000/api"
const WS_URL = "ws://localhost:8000/ws"

export function ChatTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(0)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Load saved chat sessions on startup
  useEffect(() => {
    loadSavedSessions()
  }, [])

  const loadSavedSessions = async () => {
    try {
      setIsLoadingSessions(true)
      const response = await fetch(`${API_BASE}/chat/sessions/load`)
      if (response.ok) {
        const data = await response.json()
        const savedSessions = data.sessions || []
        
        if (savedSessions.length > 0) {
          setSessions(savedSessions)
          setCurrentSessionIndex(0)
        } else {
          // Create initial session if no saved sessions
          createNewChat()
        }
      } else {
        console.error('Failed to load saved sessions')
        createNewChat()
      }
    } catch (error) {
      console.error('Error loading saved sessions:', error)
      createNewChat()
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // Initialize with one empty session only if no saved sessions
  useEffect(() => {
    if (!isLoadingSessions && sessions.length === 0) {
      createNewChat()
    }
  }, [isLoadingSessions])

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      setConnectionStatus("connecting")
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionStatus("connected")
        console.log("WebSocket connected")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      ws.onclose = (event) => {
        setConnectionStatus("disconnected")
        console.log("WebSocket disconnected", event.code, event.reason)
        // Only reconnect if it wasn't a manual close
        if (event.code !== 1000) {
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connectWebSocket()
            }
          }, 3000)
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setConnectionStatus("disconnected")
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting") // Clean close
        wsRef.current = null
      }
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [sessions, currentSessionIndex])

  const saveCurrentSession = async () => {
    const currentSession = getCurrentSession()
    if (currentSession && currentSession.messages.length > 0) {
      try {
        await fetch(`${API_BASE}/chat/sessions/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: currentSession.id,
            messages: currentSession.messages,
            user_query: currentSession.messages.find(m => m.role === 'user')?.content
          }),
        })
      } catch (error) {
        console.error('Error saving session:', error)
      }
    }
  }

  // Auto-save session when messages change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveCurrentSession()
    }, 2000) // Save 2 seconds after last change
    
    return () => clearTimeout(timeoutId)
  }, [sessions, currentSessionIndex])

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: `chat_${Date.now()}`,
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      created: new Date().toISOString()
    }
    setSessions(prev => [...prev, newSession])
    setCurrentSessionIndex(sessions.length)
  }

  const getCurrentSession = () => {
    return sessions[currentSessionIndex] || null
  }

  const getCurrentMessages = () => {
    const session = getCurrentSession()
    return session ? session.messages : []
  }

  const addMessageToCurrentSession = (message: Message) => {
    setSessions(prev => {
      const newSessions = [...prev]
      
      // If message has a session_id, try to find the correct session
      let targetSessionIndex = currentSessionIndex
      if (message.session_id) {
        const foundIndex = newSessions.findIndex(session => 
          session.id === message.session_id || 
          session.id.includes(message.session_id.split('_').pop() || '')
        )
        if (foundIndex !== -1) {
          targetSessionIndex = foundIndex
        }
      }
      
      if (newSessions[targetSessionIndex]) {
        // Check if message already exists in this session
        const existingMessages = newSessions[targetSessionIndex].messages
        const messageExists = existingMessages.some(msg => 
          msg.id === message.id || 
          (msg.content === message.content && 
           msg.role === message.role && 
           Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000)
        )
        
        if (!messageExists) {
          newSessions[targetSessionIndex] = {
            ...newSessions[targetSessionIndex],
            messages: [...newSessions[targetSessionIndex].messages, message]
          }
          // Switch to the session if message was added to a different session
          if (targetSessionIndex !== currentSessionIndex) {
            setCurrentSessionIndex(targetSessionIndex)
          }
        }
      }
      return newSessions
    })
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case "chat_message":
        const newMessage: Message = {
          id: data.message.id,
          role: data.message.role,
          content: data.message.content,
          timestamp: data.message.timestamp,
          session_id: data.session_id
        }
        
        console.log('Received WebSocket message:', newMessage) // Debug log
        addMessageToCurrentSession(newMessage)
        break

      case "chat_status":
        if (data.status === "thinking") {
          setIsLoading(true)
        }
        break

      case "chat_complete":
        setIsLoading(false)
        console.log(`Query completed in ${data.iterations} iterations`)
        if (data.files_accessed?.length > 0) {
          console.log("Files accessed:", data.files_accessed)
        }
        break

      case "chat_error":
        setIsLoading(false)
        console.error("Chat error:", data.error)
        // Add error message to chat
        const errorMessage: Message = {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: "assistant",
          content: `Error: ${data.error}`,
          timestamp: new Date().toISOString()
        }
        addMessageToCurrentSession(errorMessage)
        break
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const messageContent = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageContent,
          session_id: getCurrentSession()?.id
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ChatResponse = await response.json()
      
      // The user message will be added via WebSocket, so we don't add it here
      
    } catch (error) {
      setIsLoading(false)
      console.error("Error sending message:", error)
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString()
      }
      addMessageToCurrentSession(errorMessage)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const switchToSession = (index: number) => {
    setCurrentSessionIndex(index)
  }

  const currentMessages = getCurrentMessages()
  const currentSession = getCurrentSession()

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row relative w-full bg-black">
      {/* Mobile Header with Sidebar Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-black z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white truncate">
            {currentSession?.name || "AI Assistant"}
          </h3>
        </div>
        <Button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Chat History Sidebar */}
      <div className={`${
        isSidebarOpen ? 'flex' : 'hidden'
      } lg:flex w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-gray-800 flex-col order-2 lg:order-1 absolute lg:relative z-20 lg:z-auto bg-black h-full lg:h-auto`}>
        <div className="p-4 lg:p-6 border-b border-gray-800">
          <Button
            onClick={() => {
              createNewChat()
              setIsSidebarOpen(false)
            }}
            className="w-full bg-white hover:bg-gray-200 text-black h-12 text-sm font-medium rounded-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-3 lg:p-4 space-y-2">
            {isLoadingSessions ? (
              <div className="p-6 text-center text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm">Loading conversations...</p>
              </div>
            ) : (
              sessions.map((session, index) => {
                const isActive = index === currentSessionIndex
                const lastMessage = session.messages[session.messages.length - 1]
                const preview = lastMessage ? lastMessage.content.slice(0, 50) + '...' : 'No messages yet'
                
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      switchToSession(index)
                      setIsSidebarOpen(false)
                    }}
                    className={`group p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                      isActive
                        ? "bg-gray-800 border-gray-700"
                        : "hover:bg-gray-900 border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isActive ? 'bg-white' : 'bg-gray-600'
                        }`} />
                        <h4 className="text-sm font-semibold text-white truncate">
                          {session.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <MessageCircle className="w-3 h-3" />
                        <span>{session.messages.length}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {preview}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(session.created).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Connection Status */}
        <div className="p-4 lg:p-6 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-green-400 animate-pulse" : 
                connectionStatus === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"
              }`} />
              <span className="text-xs text-gray-400 font-medium">
                {connectionStatus === "connected" ? "Online" : 
                 connectionStatus === "connecting" ? "Connecting..." : "Offline"}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              AI Ready
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col order-1 lg:order-2 min-h-0 overflow-hidden">
        {/* Desktop Chat Header */}
        <div className="hidden lg:block p-6 xl:p-8 border-b border-gray-800 flex-shrink-0 bg-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {currentSession?.name || "Start a Conversation"}
                </h3>
                {currentSession && (
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{currentMessages.length} messages</span>
                    <span className="text-gray-600">•</span>
                    <Clock className="w-4 h-4" />
                    <span>Created {new Date(currentSession.created).toLocaleDateString()}</span>
                  </p>
                )}
              </div>
            </div>
            {connectionStatus === "connected" && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">AI Online</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden bg-black">
          <div className="w-full h-full max-w-7xl mx-auto">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="space-y-8 p-8 lg:p-16">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-20 lg:py-32">
                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-6 border border-gray-700">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Ready to analyze your files</h3>
                    <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
                      Ask me anything about your documents. I can extract information, summarize content, and answer specific questions.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300">
                        📄 PDF Analysis
                      </div>
                      <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300">
                        📊 Data Extraction
                      </div>
                      <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300">
                        📝 Content Summary
                      </div>
                    </div>
                  </div>
                ) : (
                  currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-4 lg:gap-6 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-700">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] lg:max-w-[75%] p-5 lg:p-6 rounded-lg ${
                          message.role === "user"
                            ? "bg-gray-900 text-white border border-gray-800"
                            : "bg-gray-800 text-gray-100 border border-gray-700"
                        }`}
                      >
                        <p className="text-base lg:text-lg leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p className={`text-xs mt-3 flex items-center gap-1 ${
                          message.role === "user" ? "text-gray-400" : "text-gray-400"
                        }`}>
                          <Clock className="w-3 h-3" />
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600 flex-shrink-0">
                          <User className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex items-start gap-4 lg:gap-6">
                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-700">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-gray-800 text-gray-100 border border-gray-700 p-5 lg:p-6 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                        <span className="text-base text-gray-300 ml-2 font-medium">AI is analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Input */}
        <div className="p-6 lg:p-8 border-t border-gray-800 flex-shrink-0 bg-black">
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to analyze your files..."
                  className="w-full bg-gray-900 border-gray-700 text-white placeholder-gray-400 h-14 px-6 rounded-lg focus:border-gray-600 focus:ring-2 focus:ring-gray-600 text-base transition-all duration-200 pr-24"
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || connectionStatus !== "connected" || !currentSession}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  {connectionStatus === "connected" ? (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                  )}
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || connectionStatus !== "connected" || !currentSession}
                className="bg-white hover:bg-gray-200 text-black h-14 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-all duration-200"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            {connectionStatus !== "connected" && (
              <p className="text-center text-sm text-red-400 mt-3 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                Connection lost. Trying to reconnect...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
