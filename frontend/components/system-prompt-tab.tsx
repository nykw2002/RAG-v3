"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Save, RotateCcw, RefreshCw } from "lucide-react"

const API_BASE = "http://localhost:8000/api"

export function SystemPromptTab() {
  const [prompt, setPrompt] = useState("")
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [isSaved, setIsSaved] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load system prompt on component mount
  useEffect(() => {
    loadSystemPrompt()
  }, [])

  const loadSystemPrompt = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE}/system-prompt`)
      if (response.ok) {
        const data = await response.json()
        setPrompt(data.prompt)
        setOriginalPrompt(data.prompt)
        setIsSaved(true)
      } else {
        console.error("Failed to load system prompt")
        // Set default prompt if loading fails
        const defaultPrompt = `You are a helpful AI assistant. You should:
- Provide accurate and helpful information
- Be concise but thorough in your responses
- Ask clarifying questions when needed
- Maintain a professional and friendly tone
- Respect user privacy and safety guidelines`
        setPrompt(defaultPrompt)
        setOriginalPrompt(defaultPrompt)
      }
    } catch (error) {
      console.error("Error loading system prompt:", error)
      // Set default prompt on error
      const defaultPrompt = `You are a helpful AI assistant. You should:
- Provide accurate and helpful information
- Be concise but thorough in your responses
- Ask clarifying questions when needed
- Maintain a professional and friendly tone
- Respect user privacy and safety guidelines`
      setPrompt(defaultPrompt)
      setOriginalPrompt(defaultPrompt)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch(`${API_BASE}/system-prompt`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (response.ok) {
        setIsSaved(true)
        setOriginalPrompt(prompt)
        console.log("System prompt saved successfully")
      } else {
        const error = await response.json()
        alert(`Save failed: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error saving system prompt:", error)
      alert("Save failed. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPrompt(originalPrompt)
    setIsSaved(true)
  }

  const handleChange = (value: string) => {
    setPrompt(value)
    setIsSaved(value === originalPrompt)
  }

  const handleRefresh = () => {
    loadSystemPrompt()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">System Prompt Configuration</h2>
          <p className="text-gray-500">Define the behavior and personality of your AI assistant</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-700 animate-spin" />
          <span className="text-gray-500 ml-3">Loading system prompt...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium text-white mb-2">System Prompt Configuration</h2>
        <p className="text-gray-500">Define the behavior and personality of your AI assistant</p>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter your system prompt..."
            className="min-h-[400px] bg-gray-900 border-gray-800 text-white placeholder-gray-500 resize-none rounded-lg p-4 focus:border-gray-600"
            disabled={isSaving}
          />
          {isSaving && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 text-white">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isSaved ? "bg-green-400" : "bg-yellow-400"}`} />
            <span className="text-sm text-gray-400">
              {isSaved ? "Saved" : "Unsaved changes"}
            </span>
            {prompt.length > 0 && (
              <span className="text-xs text-gray-500">
                {prompt.length} characters
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={isSaving}
              className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent h-10 px-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isSaving || isSaved}
              className="border-gray-800 text-gray-300 hover:bg-gray-900 bg-transparent h-10 px-6"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-white hover:bg-gray-200 text-black h-10 px-6" 
              disabled={isSaved || isSaving}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help text */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Tips for System Prompts</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Be specific about the AI's role and expertise</li>
            <li>• Include guidelines for tone and communication style</li>
            <li>• Specify any constraints or limitations</li>
            <li>• Changes will take effect immediately for new conversations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
