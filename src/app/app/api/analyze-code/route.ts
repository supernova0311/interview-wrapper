import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { code, language, apiKey, codeSnapshots, typingPatterns, averageTypingInterval, sessionDuration } =
      await request.json()

    if (!code || !language) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Use provided API key or get from environment variables
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      console.error("Gemini API key not provided and not set in environment variables")
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

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

    // Call Gemini API
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Gemini API Error:", errorText)
      return NextResponse.json({ error: `Gemini API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()

    // Extract the text from Gemini's response
    const responseText = data.candidates[0]?.content?.parts[0]?.text || ""

    // Try to parse the JSON from the response
    let analysisResult
    try {
      // Find JSON in the response (it might be surrounded by markdown code blocks)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
        responseText.match(/```\n([\s\S]*?)\n```/) || [null, responseText]

      const jsonText = jsonMatch[1] || responseText
      analysisResult = JSON.parse(jsonText)
    } catch (error) {
      console.error("Error parsing Gemini response:", error)

      // If parsing fails, create a structured response from the text
      analysisResult = {
        approach: "Failed to parse structured response. Raw analysis:",
        logic: "",
        aiDetection: "",
        suggestions: "",
        overallScore: 0,
        rawResponse: responseText,
      }
    }

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Failed to analyze code: " + (error as Error).message }, { status: 500 })
  }
}

