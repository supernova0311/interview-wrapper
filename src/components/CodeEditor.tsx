"use client"

import { CODING_QUESTIONS, LANGUAGES } from "@/constants"
import { useState } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable"
import { ScrollArea, ScrollBar } from "./ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { AlertCircleIcon, BookIcon, LightbulbIcon, PlayIcon, TerminalIcon } from "lucide-react"
import Editor from "@monaco-editor/react"
import { Button } from "./ui/button"

function CodeEditor() {
  const [selectedQuestion, setSelectedQuestion] = useState(CODING_QUESTIONS[0])
  const [language, setLanguage] = useState<"javascript" | "python" | "java">(LANGUAGES[0].id)
  const [code, setCode] = useState(selectedQuestion.starterCode[language])
  const [output, setOutput] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const handleQuestionChange = (questionId: string) => {
    const question = CODING_QUESTIONS.find((q) => q.id === questionId)!
    setSelectedQuestion(question)
    setCode(question.starterCode[language])
    setOutput("")
    setError(null)
  }

  const handleLanguageChange = (newLanguage: "javascript" | "python" | "java") => {
    setLanguage(newLanguage)
    setCode(selectedQuestion.starterCode[newLanguage])
    setOutput("")
    setError(null)
  }

  const executeCode = async () => {
    setIsExecuting(true)
    setOutput("")
    setError(null)

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setOutput(data.output || "Program executed with no output")
      }
    } catch (err: any) {
      setError(`Failed to execute code: ${err.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-[calc(100vh-4rem-1px)]">
      {/* QUESTION SECTION */}
      <ResizablePanel defaultSize={40}>
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight">{selectedQuestion.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Choose your language and solve the problem</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedQuestion.id} onValueChange={handleQuestionChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select question" />
                    </SelectTrigger>
                    <SelectContent>
                      {CODING_QUESTIONS.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[150px]">
                      {/* SELECT VALUE */}
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <img src={`/${language}.png`} alt={language} className="w-5 h-5 object-contain" />
                          {LANGUAGES.find((l) => l.id === language)?.name}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    {/* SELECT CONTENT */}
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

              {/* PROBLEM DESC. */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <BookIcon className="h-5 w-5 text-primary/80" />
                  <CardTitle>Problem Description</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-line">{selectedQuestion.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* PROBLEM EXAMPLES */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-full w-full rounded-md border">
                    <div className="p-4 space-y-4">
                      {selectedQuestion.examples.map((example, index) => (
                        <div key={index} className="space-y-2">
                          <p className="font-medium text-sm">Example {index + 1}:</p>
                          <ScrollArea className="h-full w-full rounded-md">
                            <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                              <div>Input: {example.input}</div>
                              <div>Output: {example.output}</div>
                              {example.explanation && (
                                <div className="pt-2 text-muted-foreground">Explanation: {example.explanation}</div>
                              )}
                            </pre>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                    <ScrollBar />
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* CONSTRAINTS */}
              {selectedQuestion.constraints && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <AlertCircleIcon className="h-5 w-5 text-blue-500" />
                    <CardTitle>Constraints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1.5 text-sm marker:text-muted-foreground">
                      {selectedQuestion.constraints.map((constraint, index) => (
                        <li key={index} className="text-muted-foreground">
                          {constraint}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* CODE EDITOR */}
      <ResizablePanel defaultSize={40}>
        <div className="h-full relative">
          <div className="absolute top-2 right-4 z-10">
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
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 18,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              wordWrap: "on",
              wrappingIndent: "indent",
            }}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* COMPILER OUTPUT */}
      <ResizablePanel defaultSize={20}>
        <div className="h-full bg-black text-white p-4 font-mono text-sm">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground border-b border-muted pb-2">
            <TerminalIcon className="h-4 w-4" />
            <span>Output</span>
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
  )
}

export default CodeEditor

