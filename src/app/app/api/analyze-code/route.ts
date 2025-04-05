import { type NextRequest, NextResponse } from "next/server"

// Mock analysis data as fallback only
const MOCK_ANALYSIS = {
  approach: "This is a mock analysis. The API call failed or is not configured properly.",
  logic: "Please check your Gemini API key configuration and server logs.",
  aiDetection: "This is not a real AI analysis - this is fallback mock data.",
  suggestions: "Set up your Gemini API key properly to get real analysis.",
  overallScore: 5,
}

export async function POST(request: NextRequest) {
  try {
    console.log("Analyze code API route called")

    const { code, language, codeSnapshots, typingPatterns, averageTypingInterval, sessionDuration } =
      await request.json()

    if (!code || !language) {
      console.error("Missing required parameters")
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Log API key status for debugging
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    console.log("API key available:", !!apiKey)

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables")
      return NextResponse.json(
        {
          error: "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.",
          isMockData: true,
          ...MOCK_ANALYSIS,
        },
        { status: 200 },
      )
    }

    // Get the model name from environment variable or use a default
    const modelName = process.env.GEMINI_MODEL_NAME || "models/gemini-1.5-flash"

    // Construct the prompt for Gemini with additional context
    const prompt = `
      You are a code analysis expert specializing in detecting AI-written code and evaluating coding approaches. 
      Analyze the following ${language} code and provide a detailed report.
      
      CONTEXT:
      - Session duration: ${sessionDuration || "Unknown"} seconds
      - Average typing interval: ${averageTypingInterval ? Math.round(averageTypingInterval) : "Unknown"} ms
      - Number of typing pattern samples: ${typingPatterns || 0}
      ${codeSnapshots ? `- Code evolution: ${codeSnapshots.length} snapshots recorded` : ""}
      
      ANALYSIS REQUIREMENTS:
      1. Approach Analysis: Evaluate the overall approach and design of the code. Consider whether the approach is efficient, elegant, and appropriate for the problem.
      
      2. Logic Analysis: Analyze the logic, algorithms, and problem-solving techniques used. Identify any logical errors or inefficiencies.
      
      3. AI Detection: Determine if this code appears to be written by AI or a human, with detailed reasoning. Consider:
         - Typing patterns (humans typically have variable typing speeds)
         - Code evolution (humans typically write code incrementally with mistakes and corrections)
         - Stylistic markers (AI often produces overly consistent or "perfect" code)
         - Comment style and frequency
         - Variable naming patterns
         - Problem-solving approach
      
      4. Improvement Suggestions: Provide specific suggestions to improve the code.
      
      5. Overall Score: Rate the code quality from 1-10.
      
      Format your response as a JSON object with the following keys:
      - approach (string)
      - logic (string)
      - aiDetection (string)
      - suggestions (string)
      - overallScore (number)
      
      Here is the code to analyze:
      
      \`\`\`${language}
      ${code}
      \`\`\`
    `

    console.log(`Calling Gemini API with model: ${modelName}, prompt length: ${prompt.length}`)

    // First, let's try to list available models to help with debugging
    try {
      const listModelsResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
      })

      if (listModelsResponse.ok) {
        const modelsData = await listModelsResponse.json()
        console.log("Available models:", modelsData.models?.map((m: any) => m.name).join(", ") || "No models found")
      } else {
        console.log("Failed to list models:", await listModelsResponse.text())
      }
    } catch (error) {
      console.error("Error listing models:", error)
    }

    // Try different model endpoints
    const modelEndpoints = [
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`,
    ]

    let successfulResponse = null
    let lastError = null

    // Try each endpoint until one works
    for (const endpoint of modelEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        })

        console.log(`Response from ${endpoint}: ${response.status}`)

        if (response.ok) {
          successfulResponse = response
          break
        } else {
          const errorText = await response.text()
          console.log(`Error from ${endpoint}: ${errorText}`)
          lastError = { status: response.status, text: errorText }
        }
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error)
        lastError = error
      }
    }

    if (!successfulResponse) {
      console.error("All model endpoints failed. Last error:", lastError)
      return NextResponse.json(
        {
          error: `All Gemini API endpoints failed. Last error: ${JSON.stringify(lastError)}`,
          isMockData: true,
          ...MOCK_ANALYSIS,
        },
        { status: 200 },
      )
    }

    // Process the successful response
    try {
      const data = await successfulResponse.json()
      console.log("Gemini API response received, parsing...")

      // Extract the text from Gemini's response
      const responseText = data.candidates[0]?.content?.parts[0]?.text || ""
      console.log("Response text length:", responseText.length)

      // Try to parse the JSON from the response
      let analysisResult
      try {
        // Find JSON in the response (it might be surrounded by markdown code blocks)
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
          responseText.match(/```\n([\s\S]*?)\n```/) || [null, responseText]

        const jsonText = jsonMatch[1] || responseText
        analysisResult = JSON.parse(jsonText)
        console.log("Successfully parsed JSON response")

        // Add flag to indicate this is real data
        analysisResult.isMockData = false

        return NextResponse.json(analysisResult)
      } catch (error) {
        console.error("Error parsing Gemini response:", error)

        // If parsing fails, create a structured response from the text
        return NextResponse.json({
          approach: "Failed to parse structured response. Raw analysis: " + responseText.substring(0, 500),
          logic: "Error parsing Gemini response.",
          aiDetection: "Unable to determine.",
          suggestions: "Please try again with a different code sample.",
          overallScore: 0,
          isMockData: false,
          rawResponse: responseText.substring(0, 1000),
        })
      }
    } catch (apiError) {
      console.error("Error processing API response:", apiError)
      return NextResponse.json(
        {
          error: "Failed to process API response: " + (apiError as Error).message,
          isMockData: true,
          ...MOCK_ANALYSIS,
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze code: " + (error as Error).message,
        isMockData: true,
        ...MOCK_ANALYSIS,
      },
      { status: 200 },
    )
  }
}

