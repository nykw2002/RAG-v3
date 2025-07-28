"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Database, Download, RefreshCw, CheckCircle, AlertCircle, FileText, Eye } from "lucide-react"

interface MigrationLog {
  timestamp: string
  message: string
  type: "success" | "error" | "info"
}

interface MigrationStatus {
  isRunning: boolean
  progress: number
  logs: MigrationLog[]
  completed: boolean
}

interface SessionData {
  session_id: string
  timestamp: string
  user_query: string
  final_answer: string
  total_iterations: number
  files_accessed: string[]
  system_prompt?: string
}

interface ExcelPreviewData {
  columns: string[]
  data: Record<string, any>[]
  total_rows: number
  preview_rows: number
  file_exists: boolean
  error?: string
}

const API_BASE = "http://localhost:8000/api"
const WS_URL = "ws://localhost:8000/ws"

export function EvaluationTab() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    isRunning: false,
    progress: 0,
    logs: [],
    completed: false
  })
  const [lastMigration, setLastMigration] = useState<Date | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<ExcelPreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const wsRef = useRef<WebSocket | null>(null)

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      setConnectionStatus("connecting")
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionStatus("connected")
        console.log("WebSocket connected for evaluation")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      ws.onclose = () => {
        setConnectionStatus("disconnected")
        console.log("WebSocket disconnected")
        setTimeout(connectWebSocket, 3000)
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setConnectionStatus("disconnected")
      }
    }

    connectWebSocket()
    loadMigrationStatus()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case "migration_progress":
        setMigrationStatus(prev => ({
          ...prev,
          progress: data.progress,
          logs: data.logs
        }))
        break

      case "migration_complete":
        setMigrationStatus(prev => ({
          ...prev,
          isRunning: false,
          completed: data.completed,
          logs: data.logs
        }))
        if (data.completed) {
          setLastMigration(new Date())
        }
        break
    }
  }

  const loadMigrationStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/evaluation/status`)
      if (response.ok) {
        const status: MigrationStatus = await response.json()
        setMigrationStatus(status)
      }
    } catch (error) {
      console.error("Error loading migration status:", error)
    }
  }

  const handleMigrateData = async () => {
    try {
      const response = await fetch(`${API_BASE}/evaluation/migrate`, {
        method: "POST"
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Migration started:", result.message)
        setMigrationStatus(prev => ({
          ...prev,
          isRunning: true,
          progress: 0,
          logs: [],
          completed: false
        }))
      } else {
        const error = await response.json()
        alert(`Migration failed to start: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error starting migration:", error)
      alert("Failed to start migration. Please try again.")
    }
  }

  const handleDownloadExcel = async () => {
    try {
      const response = await fetch(`${API_BASE}/evaluation/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = "evaluation_report.xlsx"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(`Download failed: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error downloading Excel file:", error)
      alert("Download failed. Please try again.")
    }
  }

  const handlePreviewExcel = async () => {
    setIsLoadingPreview(true)
    try {
      const response = await fetch(`${API_BASE}/evaluation/preview`)
      if (response.ok) {
        const data: ExcelPreviewData = await response.json()
        setPreviewData(data)
        setIsPreviewOpen(true)
      } else {
        const error = await response.json()
        alert(`Preview failed: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error loading Excel preview:", error)
      alert("Failed to load Excel preview")
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setIsPreviewOpen(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-medium text-white mb-2">Data Evaluation</h2>
        <p className="text-gray-500">Migrate and evaluate your conversation data for analysis</p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === "connected" ? "bg-green-400" : 
          connectionStatus === "connecting" ? "bg-yellow-400" : "bg-red-400"
        }`} />
        <span className="text-sm text-gray-400">
          {connectionStatus === "connected" ? "Connected" : 
           connectionStatus === "connecting" ? "Connecting..." : "Disconnected"}
        </span>
      </div>

      {/* Migration Section */}
      <div className="border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">Data Migration</h3>
          {lastMigration && (
            <span className="text-sm text-gray-500">Last migration: {lastMigration.toLocaleString()}</span>
          )}
        </div>

        <div className="space-y-6">
          <Button
            onClick={handleMigrateData}
            disabled={migrationStatus.isRunning || connectionStatus !== "connected"}
            className="bg-white hover:bg-gray-200 text-black w-full h-12"
          >
            {migrationStatus.isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Migrating Data...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Migrate Data
              </>
            )}
          </Button>

          {migrationStatus.isRunning && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="text-gray-400">{Math.round(migrationStatus.progress)}%</span>
              </div>
              <Progress value={migrationStatus.progress} className="w-full h-2" />
            </div>
          )}

          {migrationStatus.logs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-400">Migration Log</h4>
              <ScrollArea className="h-32 bg-gray-900 border border-gray-800 rounded p-4">
                <div className="space-y-2">
                  {migrationStatus.logs.map((log, index) => (
                    <div key={index} className="flex items-center gap-3 text-xs">
                      {log.type === "success" && <CheckCircle className="w-3 h-3 text-green-400" />}
                      {log.type === "error" && <AlertCircle className="w-3 h-3 text-red-400" />}
                      {log.type === "info" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-gray-300">{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Excel File Display */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-6">Evaluation Report</h3>

        <div className="border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <h4 className="text-white font-medium">evaluation_report.xlsx</h4>
                <p className="text-sm text-gray-500">Generated evaluation data and metrics</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handlePreviewExcel}
                disabled={isLoadingPreview}
                variant="outline"
                className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent h-10 px-6"
              >
                {isLoadingPreview ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {isLoadingPreview ? "Loading..." : "Preview"}
              </Button>
              <Button
                onClick={handleDownloadExcel}
                variant="outline"
                className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent h-10 px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-900 p-4 rounded border border-gray-800">
              <p className="text-gray-500">Status</p>
              <p className="text-white font-medium mt-1">
                {migrationStatus.completed ? "Available" : "Not Generated"}
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-800">
              <p className="text-gray-500">Connection</p>
              <p className="text-white font-medium mt-1 capitalize">{connectionStatus}</p>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-800">
              <p className="text-gray-500">Last Updated</p>
              <p className="text-white font-medium mt-1">
                {lastMigration ? lastMigration.toLocaleDateString() : "Never"}
              </p>
            </div>
          </div>

          {!migrationStatus.completed && (
            <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded">
              <p className="text-gray-400 text-sm">
                No evaluation report available. Run data migration to generate the Excel file.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Excel Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-gray-800 rounded-lg w-full max-w-6xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-medium text-white">query_tracking.xlsx</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewData?.file_exists 
                    ? `Preview of evaluation data (${previewData.total_rows} total rows)`
                    : "Excel file preview"}
                </p>
              </div>
              <button onClick={closePreview} className="text-gray-400 hover:text-white transition-colors p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {!previewData?.file_exists ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">
                        {previewData?.error || "Excel file not available"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Run data migration first to generate the Excel file
                      </p>
                    </div>
                  ) : previewData.data.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">No data found in Excel file</p>
                      <p className="text-sm text-gray-600">
                        The file exists but contains no data rows
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Showing {previewData.preview_rows} of {previewData.total_rows} rows
                        </div>
                        <div className="text-sm text-gray-400">
                          {previewData.columns.length} columns
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto border border-gray-800 rounded-lg">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-gray-800">
                              {previewData.columns.map((column, index) => (
                                <th key={index} className="text-left p-3 font-medium text-gray-300 bg-gray-900 min-w-[120px]">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.data.map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-b border-gray-800 hover:bg-gray-900/30">
                                {previewData.columns.map((column, colIndex) => {
                                  const value = row[column]
                                  const displayValue = value === null || value === undefined ? 
                                    <span className="text-gray-500 italic">null</span> : 
                                    String(value)
                                  
                                  return (
                                    <td key={colIndex} className="p-3 text-gray-300 max-w-xs">
                                      <div className="truncate" title={String(value || '')}>
                                        {displayValue}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {previewData.preview_rows < previewData.total_rows && (
                        <div className="mt-4 p-3 bg-gray-900 border border-gray-800 rounded">
                          <p className="text-sm text-gray-400">
                            Showing first {previewData.preview_rows} rows. Download the full Excel file to see all {previewData.total_rows} rows.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
              <Button
                onClick={handleDownloadExcel}
                variant="outline"
                className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent h-10 px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={closePreview} className="bg-white hover:bg-gray-200 text-black h-10 px-6">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
