import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    // Try to list available models
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Failed to list models: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()

    // Extract model names
    const modelNames = data.models?.map((model: any) => model.name) || []

    return NextResponse.json({ models: modelNames })
  } catch (error) {
    console.error("Error listing models:", error)
    return NextResponse.json({ error: `Server error: ${(error as Error).message}` }, { status: 500 })
  }
}

