import { type NextRequest, NextResponse } from "next/server"

// Language mapping for JDoodle API
const JDOODLE_LANGUAGE_CONFIG = {
  javascript: { language: "nodejs", versionIndex: "4" },
  python: { language: "python3", versionIndex: "4" },
  java: { language: "java", versionIndex: "4" },
  cpp: { language: "cpp17", versionIndex: "1" },
  c: { language: "c", versionIndex: "5" },
  csharp: { language: "csharp", versionIndex: "4" },
  ruby: { language: "ruby", versionIndex: "4" },
  php: { language: "php", versionIndex: "4" },
  swift: { language: "swift", versionIndex: "4" },
  go: { language: "go", versionIndex: "4" },
}

export async function POST(request: NextRequest) {
  try {
    const { code, language } = await request.json()

    const clientId = process.env.JDOODLE_CLIENT_ID
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "JDoodle credentials are not configured" }, { status: 500 })
    }

    // Get language configuration
    const langConfig = JDOODLE_LANGUAGE_CONFIG[language as keyof typeof JDOODLE_LANGUAGE_CONFIG]

    if (!langConfig) {
      return NextResponse.json({ error: `Language '${language}' is not supported` }, { status: 400 })
    }

    // Execute code using JDoodle API
    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script: code,
        language: langConfig.language,
        versionIndex: langConfig.versionIndex,
      }),
    })

    if (!response.ok) {
      let errorMessage = ""
      try {
        const errorData = await response.json()
        errorMessage = JSON.stringify(errorData)
      } catch {
        errorMessage = await response.text()
      }

      console.error("JDoodle API Error:", errorMessage)

      return NextResponse.json({ error: `Execution failed: ${errorMessage}` }, { status: response.status })
    }

    const result = await response.json()

    // Process the results
    if (result.error) {
      return NextResponse.json({ error: result.error })
    }

    // Format the output with additional information
    let formattedOutput = result.output

    // Add execution stats if available
    if (result.memory || result.cpuTime) {
      formattedOutput += "\n\n--- Execution Stats ---"
      if (result.memory) formattedOutput += `\nMemory: ${result.memory} KB`
      if (result.cpuTime) formattedOutput += `\nCPU Time: ${result.cpuTime} seconds`
    }

    return NextResponse.json({
      output: formattedOutput,
      stats: {
        memory: result.memory,
        cpuTime: result.cpuTime,
        statusCode: result.statusCode,
      },
    })
  } catch (err: any) {
    console.error("Server error:", err)
    return NextResponse.json({ error: "Failed to execute code: " + err.message }, { status: 500 })
  }
}

