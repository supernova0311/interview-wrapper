"use client"

import { useState, useRef, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable"
import { ScrollArea } from "./ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Slider } from "./ui/slider"
import { PlayIcon, TerminalIcon, Type, Download, X, Sparkles } from 'lucide-react'
import Editor, { type Monaco } from "@monaco-editor/react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Loader2 } from 'lucide-react'
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import type { editor } from "monaco-editor"

// Simple empty function templates for each language
const STARTER_CODE = {
  javascript: `// JavaScript Empty Function
function myFunction() {
  // Your code here
  
}

// Call the function
myFunction();
`,
  python: `# Python Empty Function
def my_function():
    # Your code here
    pass

# Call the function
my_function()
`,
  java: `// Java Empty Class and Function
public class Main {
    public static void main(String[] args) {
        // Call the function
        myFunction();
    }
    
    public static void myFunction() {
        // Your code here
        
    }
}
`,
}

const LANGUAGES = [
  { id: "javascript", name: "JavaScript" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
]

function CodeEditor() {
  const [language, setLanguage] = useState<"javascript" | "python" | "java">("javascript")
  const [code, setCode] = useState(STARTER_CODE[language])
  const [output, setOutput] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [fontSize, setFontSize] = useState(18)
  const [notepadContent, setNotepadContent] = useState(
    "// Use this space for notes, pseudocode, or planning your solution...",
  )

  // Gemini analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<{
    approach: string
    logic: string
    aiDetection: string
    suggestions: string
    overallScore: number
  } | null>(null)
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState("approach")
  const [exportLoading, setExportLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | "txt">("pdf")

  // Coding session tracking
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [codeSnapshots, setCodeSnapshots] = useState<Array<{ timestamp: Date; code: string }>>([])
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "collecting" | "analyzing" | "ready">("idle")
  const [analysisIndicator, setAnalysisIndicator] = useState<string>("AI observing...")
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(true)
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null)
  const [typingPatterns, setTypingPatterns] = useState<Array<{ timestamp: Date; interval: number }>>([])
  const lastKeyPressTime = useRef<Date | null>(null)
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const codeChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Monaco instance reference
  const monacoRef = useRef<Monaco | null>(null)

  // Initialize session on component mount
  useEffect(() => {
    // Initialize session
    setSessionStartTime(new Date())
    setAnalysisStatus("collecting")
    
    // Use a hardcoded API key for development/testing
    // In production, this would come from environment variables
    setGeminiApiKey(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

    // Cleanup on unmount
    return () => {
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current)
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current)
      if (codeChangeTimeoutRef.current) clearTimeout(codeChangeTimeoutRef.current)
    }
  }, [])

  const handleLanguageChange = (newLanguage: "javascript" | "python" | "java") => {
    setLanguage(newLanguage)
    // Only set code to starter code if current code is empty or matches another language's starter code
    if (!code.trim() || Object.values(STARTER_CODE).includes(code)) {
      setCode(STARTER_CODE[newLanguage])
    }
    setOutput("")
    setError(null)
  }

  const executeCode = async () => {
    setIsExecuting(true)
    setOutput("")
    setError(null)

    try {
      console.log("Sending code execution request:", { language, codeLength: code.length })

      const response = await fetch("/app/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
        }),
      })

      console.log("Response status:", response.status)

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        setError(
          `Server error (${response.status}): ${errorText.substring(0, 200)}${errorText.length > 200 ? "..." : ""}`,
        )
        setIsExecuting(false)
        return
      }

      // Try to parse JSON response
      let data
      try {
        data = await response.json()
        console.log("Response data:", data)
      } catch (jsonError) {
        const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError)
        console.error("JSON Parse Error:", errorMessage)
        const responseText = await response.text()
        console.error("Raw Response:", responseText.substring(0, 500))
        setError(`Failed to parse response: ${errorMessage}`)
        setIsExecuting(false)
        return
      }

      if (data.error) {
        setError(data.error)
      } else {
        setOutput(data.output || "Program executed with no output")

        // Trigger analysis after successful execution if enough time has passed
        if (autoAnalysisEnabled && (!lastAnalysisTime || new Date().getTime() - lastAnalysisTime.getTime() > 60000)) {
          triggerAnalysis()
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("Fetch Error:", errorMessage)
      setError(`Failed to execute code: ${errorMessage}`)
    } finally {
      setIsExecuting(false)
    }
  }

  // Define a custom theme for the notepad editor
  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    
    monaco.editor.defineTheme("notepadTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1a1b26",
        "editor.foreground": "#d4d4d4",
        "editorLineNumber.foreground": "#6b7280",
        "editorLineNumber.activeForeground": "#d4d4d4",
        "editor.selectionBackground": "#264f78",
        "editor.lineHighlightBackground": "#2f3347",
      },
    })
  }

  // Handle code changes with debounce for analysis
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ""
    setCode(newCode)

    // Record typing pattern
    const now = new Date()
    if (lastKeyPressTime.current) {
      const interval = now.getTime() - lastKeyPressTime.current.getTime()
      if (interval > 0 && interval < 5000) {
        // Filter out long pauses
        setTypingPatterns((prev) => [...prev, { timestamp: now, interval }])
      }
    }
    lastKeyPressTime.current = now

    // Take code snapshot
    if (codeChangeTimeoutRef.current) {
      clearTimeout(codeChangeTimeoutRef.current)
    }

    codeChangeTimeoutRef.current = setTimeout(() => {
      // Only take snapshot if code has changed significantly
      const lastSnapshot = codeSnapshots[codeSnapshots.length - 1]
      if (!lastSnapshot || newCode.length !== lastSnapshot.code.length) {
        setCodeSnapshots((prev) => [...prev, { timestamp: new Date(), code: newCode }])

        // Update analysis indicator
        updateAnalysisIndicator()

        // Check if we should trigger analysis
        if (
          autoAnalysisEnabled &&
          codeSnapshots.length > 3 &&
          (!lastAnalysisTime || new Date().getTime() - lastAnalysisTime.getTime() > 120000)
        ) {
          triggerAnalysis()
        }
      }
    }, 2000)

    // Reset inactivity timer
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
    }

    // Trigger analysis after 30 seconds of inactivity
    inactivityTimeoutRef.current = setTimeout(() => {
      if (
        autoAnalysisEnabled &&
        newCode.trim().length > 50 &&
        (!lastAnalysisTime || new Date().getTime() - lastAnalysisTime.getTime() > 60000)
      ) {
        triggerAnalysis()
      }
    }, 30000)
  }

  // Handle notepad content changes
  const handleNotepadChange = (value: string | undefined) => {
    setNotepadContent(value || "")
  }

  // Update the analysis indicator based on current state
  const updateAnalysisIndicator = () => {
    const indicators = [
      "AI observing coding patterns...",
      "Analyzing approach...",
      "Evaluating logic...",
      "Detecting AI patterns...",
      "Gathering insights...",
    ]

    setAnalysisIndicator(indicators[Math.floor(Math.random() * indicators.length)])
  }

  // Function to trigger code analysis
  const triggerAnalysis = async () => {
    if (geminiApiKey === null || isAnalyzing || code.trim().length < 50) return

    setIsAnalyzing(true)
    setAnalysisStatus("analyzing")

    try {
      // Prepare analysis context with code snapshots and typing patterns
      const analysisContext = {
        code,
        language,
        codeSnapshots: codeSnapshots.slice(-5), // Last 5 snapshots
        typingPatterns: typingPatterns.length,
        averageTypingInterval:
          typingPatterns.length > 0
            ? typingPatterns.reduce((sum, pattern) => sum + pattern.interval, 0) / typingPatterns.length
            : 0,
        sessionDuration: sessionStartTime ? Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000) : 0,
      }

      const response = await fetch("/app/api/analyze-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...analysisContext,
          apiKey: geminiApiKey,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      setAnalysisReport({
        approach: data.approach || "No approach analysis available.",
        logic: data.logic || "No logic analysis available.",
        aiDetection: data.aiDetection || "AI detection analysis not available.",
        suggestions: data.suggestions || "No suggestions available.",
        overallScore: data.overallScore || 0,
      })

      setLastAnalysisTime(new Date())
      setAnalysisStatus("ready")

      // Don't automatically show the modal, just indicate analysis is ready
    } catch (error) {
      console.error("Error analyzing code:", error)
      setError(`Failed to analyze code: ${error instanceof Error ? error.message : String(error)}`)
      setAnalysisStatus("collecting")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Function to export report as PDF
  const exportAsPdf = async () => {
    if (!reportRef.current) return

    setExportLoading(true)

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#1a1b26",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save("code-analysis-report.pdf")
    } catch (error) {
      console.error("Error exporting PDF:", error)
    } finally {
      setExportLoading(false)
    }
  }

  // Function to export report as text
  const exportAsText = () => {
    if (!analysisReport) return

    setExportLoading(true)

    try {
      const text = `
CODE ANALYSIS REPORT

APPROACH:
${analysisReport.approach}

LOGIC:
${analysisReport.logic}

AI DETECTION:
${analysisReport.aiDetection}

SUGGESTIONS:
${analysisReport.suggestions}

OVERALL SCORE: ${analysisReport.overallScore}/10
      `.trim()

      const blob = new Blob([text], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "code-analysis-report.txt"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting text:", error)
    } finally {
      setExportLoading(false)
    }
  }

  // Function to handle export based on format
  const handleExport = () => {
    switch (exportFormat) {
      case "pdf":
        exportAsPdf()
        break
      case "txt":
        exportAsText()
        break
      default:
        exportAsPdf()
    }
  }

  // Get badge color based on analysis status
  const getAnalysisStatusColor = () => {
    switch (analysisStatus) {
      case "collecting":
        return "bg-blue-500"
      case "analyzing":
        return "bg-yellow-500"
      case "ready":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Editor options that allow editing
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: fontSize,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },
    wordWrap: "on",
  }

  return (
    <>
      <ResizablePanelGroup direction="vertical" className="min-h-[calc(100vh-4rem-1px)]">
        {/* NOTEPAD SECTION */}
        <ResizablePanel defaultSize={40}>
          <div className="h-full bg-[#0f111a] text-white p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <h2 className="text-xl font-semibold ml-2">Developer Notes</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Font: {fontSize}px</span>
                  <Slider
                    className="w-32"
                    min={12}
                    max={24}
                    step={1}
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                  />
                </div>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[150px] bg-[#1a1b26] border-gray-700">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <img src={`/${language}.png`} alt={language} className="w-5 h-5 object-contain" />
                        {LANGUAGES.find((l) => l.id === language)?.name}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        <div className="flex items-center gap-2">
                          <img src={`/${lang.id}.png`} alt={lang.name} className="w-5 h-5 object-contain" />
                          {lang.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex-1 rounded-md bg-[#1a1b26] border border-gray-800 overflow-hidden">
              {/* Use Monaco Editor for the notepad with minimal options */}
              <Editor
                height="100%"
                defaultLanguage="javascript"
                language="javascript"
                theme="vs-dark"
                value={notepadContent}
                onChange={handleNotepadChange}
                beforeMount={handleEditorWillMount}
                options={editorOptions}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* CODE EDITOR */}
        <ResizablePanel defaultSize={40}>
          <div className="h-full relative">
            <div className="absolute top-2 right-4 z-10 flex gap-2 items-center">
              {/* Analysis status indicator */}
              {analysisStatus !== "idle" && (
                <div
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#232534] text-xs"
                  onClick={() => analysisStatus === "ready" && setShowAnalysisModal(true)}
                  style={{ cursor: analysisStatus === "ready" ? "pointer" : "default" }}
                >
                  <div className={`h-2 w-2 rounded-full ${getAnalysisStatusColor()}`}></div>
                  <span>{analysisStatus === "ready" ? "Analysis ready - Click to view" : analysisIndicator}</span>
                </div>
              )}

              <Button onClick={executeCode} disabled={isExecuting} className="gap-2" size="sm">
                <PlayIcon className="h-4 w-4" />
                {isExecuting ? "Running..." : "Run Code"}
              </Button>
            </div>
            <Editor
              height={"100%"}
              defaultLanguage={language}
              language={language}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              beforeMount={handleEditorWillMount}
              options={editorOptions}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* COMPILER OUTPUT */}
        <ResizablePanel defaultSize={20}>
          <div className="h-full bg-black text-white p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-2 text-muted-foreground border-b border-muted pb-2">
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-4 w-4" />
                <span>Output</span>
              </div>

              {/* View analysis button */}
              {analysisStatus === "ready" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center gap-1"
                  onClick={() => setShowAnalysisModal(true)}
                >
                  <Sparkles className="h-3 w-3" />
                  View Analysis
                </Button>
              )}
            </div>
            <ScrollArea className="h-[calc(100%-2rem)]">
              {isExecuting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-20 border-t-white rounded-full"></div>
                  <span>Compiling and executing code...</span>
                </div>
              ) : error ? (
                <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
              ) : output ? (
                <pre className="whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="text-muted-foreground">
                  Click the Run button to execute your code and see the output here.
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Analysis Report Modal */}
      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Code Analysis Report</DialogTitle>
              <DialogDescription>AI-powered analysis of your code's approach, logic, and quality</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={exportFormat} onValueChange={(value: "pdf" | "docx" | "txt") => setExportFormat(value)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="txt">Text</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exportLoading}>
                {exportLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAnalysisModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div ref={reportRef} className="bg-[#1a1b26] text-white p-6 rounded-lg h-full overflow-auto">
              {analysisReport ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Code Analysis Report</h2>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-400">Overall Score:</div>
                      <div className="flex items-center">
                        <div className="text-xl font-bold">{analysisReport.overallScore}</div>
                        <div className="text-sm text-gray-400">/10</div>
                      </div>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4">
                      <TabsTrigger value="approach">Approach</TabsTrigger>
                      <TabsTrigger value="logic">Logic</TabsTrigger>
                      <TabsTrigger value="aiDetection">AI Detection</TabsTrigger>
                      <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="approach" className="mt-4">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Approach Analysis</h3>
                        <div className="bg-[#232534] p-4 rounded-md">
                          <p className="whitespace-pre-line">{analysisReport.approach}</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="logic" className="mt-4">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Logic Analysis</h3>
                        <div className="bg-[#232534] p-4 rounded-md">
                          <p className="whitespace-pre-line">{analysisReport.logic}</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="aiDetection" className="mt-4">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">AI Detection Analysis</h3>
                        <div className="bg-[#232534] p-4 rounded-md">
                          <p className="whitespace-pre-line">{analysisReport.aiDetection}</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="suggestions" className="mt-4">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Improvement Suggestions</h3>
                        <div className="bg-[#232534] p-4 rounded-md">
                          <p className="whitespace-pre-line">{analysisReport.suggestions}</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CodeEditor
