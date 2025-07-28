"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatTab } from "@/components/chat-tab"
import { SystemPromptTab } from "@/components/system-prompt-tab"
import { SessionsTab } from "@/components/sessions-tab"
import { FilesTab } from "@/components/files-tab"
import { EvaluationTab } from "@/components/evaluation-tab"
import { MessageCircle, Settings, FolderOpen, FileText, BarChart3 } from "lucide-react"

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat")

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full">
        <div className="container mx-auto p-4 lg:p-8">
          <div className="mb-8 lg:mb-12">
            <h1 className="text-3xl lg:text-4xl font-medium text-white mb-3">AI Assistant Dashboard</h1>
            <p className="text-gray-500 text-base lg:text-lg">Manage your AI interactions and data processing</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-transparent border-b border-gray-800 rounded-none p-0 h-auto">
              <TabsTrigger
                value="chat"
                className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none pb-4 text-gray-400 hover:text-gray-300"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="system-prompt"
                className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none pb-4 text-gray-400 hover:text-gray-300"
              >
                <Settings className="w-4 h-4" />
                System Prompt
              </TabsTrigger>
              <TabsTrigger
                value="sessions"
                className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none pb-4 text-gray-400 hover:text-gray-300"
              >
                <FolderOpen className="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none pb-4 text-gray-400 hover:text-gray-300"
              >
                <FileText className="w-4 h-4" />
                Files
              </TabsTrigger>
              <TabsTrigger
                value="evaluation"
                className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none pb-4 text-gray-400 hover:text-gray-300"
              >
                <BarChart3 className="w-4 h-4" />
                Evaluation
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Full-width content area for chat */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="chat" className="chat-tab-container chat-full-width">
              <ChatTab />
            </TabsContent>

            <TabsContent value="system-prompt" className="container mx-auto px-4 lg:px-8 mt-8">
              <SystemPromptTab />
            </TabsContent>

            <TabsContent value="sessions" className="container mx-auto px-4 lg:px-8 mt-8">
              <SessionsTab />
            </TabsContent>

            <TabsContent value="files" className="container mx-auto px-4 lg:px-8 mt-8">
              <FilesTab />
            </TabsContent>

            <TabsContent value="evaluation" className="container mx-auto px-4 lg:px-8 mt-8">
              <EvaluationTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
