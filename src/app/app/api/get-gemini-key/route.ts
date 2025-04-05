import { NextResponse } from "next/server"

export async function GET() {
  // Get the Gemini API key from environment variables
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment variables")
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  // Log successful API key retrieval
  console.log("Successfully retrieved Gemini API key")

  // Return the API key
  return NextResponse.json({ apiKey })
}

