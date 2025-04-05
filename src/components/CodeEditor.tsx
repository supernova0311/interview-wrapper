"use client"

import { useState, useRef, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable"
import { ScrollArea } from "./ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Slider } from "./ui/slider"
import { PlayIcon, TerminalIcon, Type, Download, X, Sparkles, AlertTriangle } from "lucide-react"
import Editor, { type Monaco } from "@monaco-editor/react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Loader2 } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import type { editor } from "monaco-editor"
import { toast } from "./ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

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
    isMockData?: boolean
  } | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState("approach")
  const [exportLoading, setExportLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | "txt">("pdf")

  // Debugging state
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Coding session tracking
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [codeSnapshots, setCodeSnapshots] = useState<Array<{ timestamp: Date; code: string }>>([])
  const [typingPatterns, setTypingPatterns] = useState<Array<{ timestamp: Date; interval: number }>>([])
  const lastKeyPressTime = useRef<Date | null>(null)

  // Monaco instance reference
  const monacoRef = useRef<Monaco | null>(null)

  // Initialize session on component mount
  useEffect(() => {
    // Initialize session
    setSessionStartTime(new Date())

    // Take initial code snapshot
    setCodeSnapshots([{ timestamp: new Date(), code: code }])
  }, [code])

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
    monacoRef.current = monaco

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

  // Handle code changes with tracking for analysis
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

    // Take code snapshot every 10 seconds or significant changes
    const lastSnapshot = codeSnapshots[codeSnapshots.length - 1]
    if (
      !lastSnapshot ||
      now.getTime() - lastSnapshot.timestamp.getTime() > 10000 ||
      Math.abs(newCode.length - lastSnapshot.code.length) > 50
    ) {
      setCodeSnapshots((prev) => [...prev, { timestamp: now, code: newCode }])
    }
  }

  // Handle notepad content changes
  const handleNotepadChange = (value: string | undefined) => {
    setNotepadContent(value || "")
  }

  // Function to manually trigger code analysis
  const analyzeCode = async () => {
    if (isAnalyzing) return

    // Show immediate feedback that the button was clicked
    toast({
      title: "Analysis started",
      description: "Starting code analysis...",
    })

    if (code.trim().length < 10) {
      toast({
        title: "Code too short",
        description: "Please write more code to analyze.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setDebugInfo("Analysis started: " + new Date().toLocaleTimeString())
    setOutput("") // Clear any previous output

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

      // Log the request for debugging
      console.log("Sending analysis request:", {
        endpoint: "/app/api/analyze-code",
        codeLength: code.length,
        language,
        snapshotsCount: codeSnapshots.length,
        typingPatternsCount: typingPatterns.length,
      })

      setDebugInfo((prev) => prev + "\nSending request to /app/api/analyze-code...")

      // Force the UI to update before making the API call
      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch("/app/api/analyze-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisContext),
      })

      setDebugInfo((prev) => prev + `\nResponse status: ${response.status}`)
      console.log("Analysis response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        setDebugInfo((prev) => prev + `\nError response: ${errorText.substring(0, 100)}...`)
        console.error("Analysis API Error:", errorText)
        throw new Error(`API error: ${response.status} - ${errorText.substring(0, 100)}`)
      }

      // Try to parse the response
      let data
      try {
        data = await response.json()
        setDebugInfo((prev) => prev + `\nParsed response successfully`)
        console.log("Analysis response data:", data)
      } catch (jsonError) {
        const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError)
        const responseText = await response.text()
        setDebugInfo(
          (prev) => prev + `\nJSON parse error: ${errorMessage}\nRaw response: ${responseText.substring(0, 100)}...`,
        )
        console.error("JSON Parse Error:", errorMessage)
        console.error("Raw Response:", responseText.substring(0, 500))
        throw new Error(`Failed to parse response: ${errorMessage}`)
      }

      if (data.error) {
        setDebugInfo((prev) => prev + `\nAPI returned error: ${data.error}`)
        throw new Error(data.error)
      }

      // Set the analysis report
      setAnalysisReport({
        approach: data.approach || "No approach analysis available.",
        logic: data.logic || "No logic analysis available.",
        aiDetection: data.aiDetection || "AI detection analysis not available.",
        suggestions: data.suggestions || "No suggestions available.",
        overallScore: data.overallScore || 0,
        isMockData: data.isMockData || false,
      })

      setDebugInfo((prev) => prev + `\nAnalysis complete, showing modal`)

      // Automatically show the analysis modal
      setShowAnalysisModal(true)

      // Show success toast
      toast({
        title: data.isMockData ? "Using Mock Data" : "Analysis Complete",
        description: data.isMockData
          ? "Using mock data because the Gemini API is not configured properly."
          : "Your code has been analyzed successfully.",
        variant: data.isMockData ? "destructive" : "default",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Error analyzing code:", error)
      setError(`Failed to analyze code: ${errorMessage}`)
      setDebugInfo((prev) => prev + `\nError: ${errorMessage}`)

      // Show error toast
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Add this function to the CodeEditor component, right after the analyzeCode function
  // This will help us debug the Gemini API issues

  const listGeminiModels = async () => {
    try {
      setIsAnalyzing(true)
      setOutput("Fetching available Gemini models...")

      const response = await fetch("/app/api/list-gemini-models", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        setOutput(`Error: ${data.error}`)
      } else if (data.models && data.models.length > 0) {
        setOutput(`Available Gemini Models:\n\n${data.models.join("\n")}`)
      } else {
        setOutput("No models found or you don't have access to any models.")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setOutput(`Failed to list models: ${errorMessage}`)
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

  // Function to export report as DOCX
  const exportAsDocx = async () => {
    if (!analysisReport) return

    setExportLoading(true)

    try {
      const response = await fetch("/app/api/docx-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report: analysisReport,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Get the blob from the response
      const blob = await response.blob()

      // Create a download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "code-analysis-report.docx"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting DOCX:", error)
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
      case "docx":
        exportAsDocx()
        break
      case "txt":
        exportAsText()
        break
      default:
        exportAsPdf()
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
              {/* Analyze button */}
              <Button
                onClick={analyzeCode}
                disabled={isAnalyzing}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isAnalyzing ? "Analyzing..." : "Analyze Code"}
              </Button>

              {/* Add this button to the UI, right after the Analyze button
              In the div with className="absolute top-2 right-4 z-10 flex gap-2 items-center"
              Add this right before the Run button: */}

              <Button onClick={listGeminiModels} className="gap-2 bg-gray-600 hover:bg-gray-700 text-white" size="sm">
                List Models
              </Button>

              {/* Run button */}
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
            </div>
            <ScrollArea className="h-[calc(100%-2rem)]">
              {isExecuting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-20 border-t-white rounded-full"></div>
                  <span>Compiling and executing code...</span>
                </div>
              ) : isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-20 border-t-white rounded-full"></div>
                  <span>Analyzing code with AI...</span>
                </div>
              ) : error ? (
                <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
              ) : debugInfo ? (
                <div>
                  <div className="text-yellow-400 mb-2">Debug Information:</div>
                  <pre className="text-gray-400 whitespace-pre-wrap text-xs">{debugInfo}</pre>
                </div>
              ) : output ? (
                <pre className="whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="text-muted-foreground">
                  <Alert variant="destructive" className="mb-4 bg-yellow-900/30 border-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>API Key Required</AlertTitle>
                    <AlertDescription>
                      To get real AI analysis, make sure the GEMINI_API_KEY environment variable is set.
                    </AlertDescription>
                  </Alert>
                  Click the Run button to execute your code and see the output here.
                  <br />
                  <br />
                  Click the Analyze button to get AI-powered insights about your code.
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
                  <SelectItem value="docx">Word</SelectItem>
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
                  {analysisReport.isMockData && (
                    <Alert variant="destructive" className="bg-red-900/30 border-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Mock Data</AlertTitle>
                      <AlertDescription>
                        This is mock data because the Gemini API key is not configured properly. Please set up your
                        GEMINI_API_KEY environment variable to get real AI analysis.
                      </AlertDescription>
                    </Alert>
                  )}

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

