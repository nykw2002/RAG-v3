"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, FileText, Download, Trash2, RefreshCw, Copy, Check } from "lucide-react"

interface SessionInfo {
  id: string
  name: string
  date: string
  messageCount: number
  size: string
  filesAccessed: string[]
}

const API_BASE = "http://localhost:8000/api"

export function SessionsTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load sessions on component mount
  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE}/chat/sessions`)
      if (response.ok) {
        const data: SessionInfo[] = await response.json()
        setSessions(data)
      } else {
        console.error("Failed to load sessions")
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionClick = async (session: SessionInfo) => {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${session.id}`)
      if (response.ok) {
        const sessionData = await response.json()
        setSelectedSession(sessionData)
        setIsModalOpen(true)
      } else {
        alert("Failed to load session details")
      }
    } catch (error) {
      console.error("Error loading session details:", error)
      alert("Failed to load session details")
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedSession(null)
    setCopied(false)
  }

  const copyJsonToClipboard = async () => {
    try {
      const jsonString = JSON.stringify(selectedSession, null, 2)
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      alert('Failed to copy to clipboard')
    }
  }

  const filteredSessions = sessions.filter((session) => 
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDownload = async (session: SessionInfo) => {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${session.id}`)
      if (response.ok) {
        const sessionData = await response.json()
        const dataStr = JSON.stringify(sessionData, null, 2)
        const dataBlob = new Blob([dataStr], { type: "application/json" })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${session.name}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        alert("Failed to download session")
      }
    } catch (error) {
      console.error("Error downloading session:", error)
      alert("Failed to download session")
    }
  }

  const handleDelete = async (session: SessionInfo) => {
    if (!confirm(`Are you sure you want to delete ${session.name}?`)) return

    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${session.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        console.log("Session deleted:", session.name)
        await loadSessions() // Refresh sessions list
      } else {
        const error = await response.json()
        alert(`Delete failed: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      alert("Delete failed. Please try again.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium text-white mb-2">Session Management</h2>
        <p className="text-gray-500 mb-6">Browse and manage your conversation sessions</p>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions..."
              className="pl-12 bg-gray-900 border-gray-800 text-white placeholder-gray-500 h-12 rounded-lg focus:border-gray-600"
            />
          </div>
          <Button
            onClick={loadSessions}
            variant="outline"
            disabled={isLoading}
            className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent h-12 px-6"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[500px] border border-gray-800 rounded-lg">
        <div className="space-y-2 p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-700 mx-auto mb-3 animate-spin" />
              <p className="text-gray-500">Loading sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchTerm ? "No sessions found matching your search" : "No sessions available"}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors cursor-pointer"
                onClick={() => handleSessionClick(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="text-white font-medium">{session.name}</h3>
                      <div className="flex items-center gap-6 text-sm text-gray-500 mt-1">
                        <span>{new Date(session.date).toLocaleDateString()}</span>
                        <span>{session.messageCount} iterations</span>
                        <span>{session.size}</span>
                        {session.filesAccessed.length > 0 && (
                          <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                            {session.filesAccessed.length} files accessed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(session)}
                      className="border-gray-800 text-gray-400 hover:bg-gray-900 bg-transparent h-8 w-8 p-0"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(session)}
                      className="border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-red-400 bg-transparent h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Session Modal */}
      {isModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-gray-800 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-medium text-white">Session Details</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSession.session_id} • {new Date(selectedSession.timestamp).toLocaleDateString()} • 
                  {selectedSession.total_iterations} iterations
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-6">
                <div className="space-y-6">
                  {/* Session Info */}
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Session Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">User Query:</span>
                        <p className="text-gray-300 mt-1">{selectedSession.user_query}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Files Accessed:</span>
                        <p className="text-gray-300 mt-1">
                          {selectedSession.files_accessed?.length > 0 
                            ? selectedSession.files_accessed.join(", ")
                            : "None"
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Final Answer */}
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Final Answer</h4>
                    <div className="border border-gray-700 rounded bg-black">
                      <ScrollArea className="h-64 w-full">
                        <div className="p-4">
                          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedSession.final_answer}</p>
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  {/* Raw JSON */}
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Raw Session Data (JSON)</h4>
                      <Button
                        onClick={copyJsonToClipboard}
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent h-8 px-3"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="border border-gray-700 rounded bg-black">
                      <ScrollArea className="h-96 w-full">
                        <pre className="text-xs text-gray-300 whitespace-pre font-mono leading-relaxed p-4 overflow-x-auto">
                          {JSON.stringify(selectedSession, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
              <Button
                onClick={() => handleDownload({ 
                  id: selectedSession.session_id, 
                  name: `session_${selectedSession.session_id}`,
                  date: selectedSession.timestamp,
                  messageCount: selectedSession.total_iterations,
                  size: "N/A",
                  filesAccessed: selectedSession.files_accessed || []
                })}
                variant="outline"
                className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent h-10 px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={closeModal} className="bg-white hover:bg-gray-200 text-black h-10 px-6">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
