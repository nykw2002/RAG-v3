"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, Download, Trash2, RefreshCw } from "lucide-react"

interface FileInfo {
  id: string
  name: string
  originalName: string
  format: string
  size: string
  date: string
  path: string
}

const API_BASE = "http://localhost:8000/api"

export function FilesTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<"txt" | "xml">("txt")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load files on component mount
  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE}/files/list`)
      if (response.ok) {
        const data: FileInfo[] = await response.json()
        setFiles(data)
      } else {
        console.error("Failed to load files")
      }
    } catch (error) {
      console.error("Error loading files:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
    } else if (file) {
      alert("Please select a PDF file")
    }
  }

  const handleManualFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (
      file &&
      (file.type === "text/plain" ||
        file.type === "text/xml" ||
        file.type === "application/xml" ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".xml"))
    ) {
      await uploadFile(file)
    } else if (file) {
      alert("Please select a TXT or XML file")
    }
  }

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE}/files/upload`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log("File uploaded:", result.filename)
        await loadFiles() // Refresh file list
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleConvert = async () => {
    if (!selectedFile) return

    try {
      setIsProcessing(true)
      
      // First upload the PDF file
      const formData = new FormData()
      formData.append("file", selectedFile)

      const uploadResponse = await fetch(`${API_BASE}/files/upload`, {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file")
      }

      // Then convert it
      const convertResponse = await fetch(
        `${API_BASE}/files/${selectedFile.name}/convert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ format: outputFormat }),
        }
      )

      if (convertResponse.ok) {
        const result = await convertResponse.json()
        console.log("Conversion completed:", result.output_file)
        setSelectedFile(null)
        await loadFiles() // Refresh file list
      } else {
        const error = await convertResponse.json()
        alert(`Conversion failed: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error converting file:", error)
      alert("Conversion failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async (file: FileInfo) => {
    try {
      const response = await fetch(`${API_BASE}/files/${file.name}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Download failed")
      }
    } catch (error) {
      console.error("Error downloading file:", error)
      alert("Download failed. Please try again.")
    }
  }

  const handleDelete = async (file: FileInfo) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return

    try {
      const response = await fetch(`${API_BASE}/files/${file.name}`, {
        method: "DELETE",
      })

      if (response.ok) {
        console.log("File deleted:", file.name)
        await loadFiles() // Refresh file list
      } else {
        const error = await response.json()
        alert(`Delete failed: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Delete failed. Please try again.")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-medium text-white mb-2">File Processing</h2>
        <p className="text-gray-500">Upload PDF files and convert them to TXT or XML format</p>
      </div>

      {/* Upload Section */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-6">Upload & Convert PDF</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Select PDF File</label>
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="bg-gray-900 border-gray-800 text-white file:bg-white file:text-black file:border-0 file:rounded file:px-3 file:py-1 file:mr-4 h-12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Output Format</label>
            <Select value={outputFormat} onValueChange={(value: "txt" | "xml") => setOutputFormat(value)}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                <SelectItem value="xml">XML Format (.xml)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleConvert}
            disabled={!selectedFile || isProcessing}
            className="bg-white hover:bg-gray-200 text-black w-full h-12"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Convert to {outputFormat.toUpperCase()}
              </>
            )}
          </Button>

          {selectedFile && (
            <div className="text-sm text-gray-500 p-3 bg-gray-900 rounded border border-gray-800">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>
      </div>

      {/* Manual File Upload Section */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-6">Upload TXT/XML Files</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Select TXT or XML File</label>
            <Input
              type="file"
              accept=".txt,.xml"
              onChange={handleManualFileSelect}
              disabled={isUploading}
              className="bg-gray-900 border-gray-800 text-white file:bg-white file:text-black file:border-0 file:rounded file:px-3 file:py-1 file:mr-4 h-12"
            />
          </div>

          {isUploading && (
            <div className="text-sm text-gray-500 p-3 bg-gray-900 rounded border border-gray-800">
              <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
              Uploading...
            </div>
          )}

          <p className="text-sm text-gray-500">Upload existing TXT or XML files directly without conversion.</p>
        </div>
      </div>

      {/* Processed Files Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Processed Files</h3>
          <Button
            onClick={loadFiles}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-700 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No files available</p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <h4 className="text-white font-medium">{file.name}</h4>
                        <div className="flex items-center gap-6 text-sm text-gray-500 mt-1">
                          <span className="uppercase bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs border border-gray-700">
                            {file.format}
                          </span>
                          <span>{file.size}</span>
                          <span>{new Date(file.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                        className="border-gray-800 text-gray-400 hover:bg-gray-900 bg-transparent h-8 w-8 p-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(file)}
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
      </div>
    </div>
  )
}
