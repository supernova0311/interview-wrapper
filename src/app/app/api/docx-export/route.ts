import { type NextRequest, NextResponse } from "next/server"
import * as docx from "docx"

export async function POST(request: NextRequest) {
  try {
    const { report } = await request.json()

    if (!report) {
      return NextResponse.json({ error: "Missing report data" }, { status: 400 })
    }

    // Create a new document
    const doc = new docx.Document({
      sections: [
        {
          properties: {},
          children: [
            new docx.Paragraph({
              text: "CODE ANALYSIS REPORT",
              heading: docx.HeadingLevel.HEADING_1,
              alignment: docx.AlignmentType.CENTER,
              spacing: { after: 200 },
            }),

            new docx.Paragraph({
              text: "Approach Analysis",
              heading: docx.HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            new docx.Paragraph({
              text: report.approach,
              spacing: { after: 200 },
            }),

            new docx.Paragraph({
              text: "Logic Analysis",
              heading: docx.HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            new docx.Paragraph({
              text: report.logic,
              spacing: { after: 200 },
            }),

            new docx.Paragraph({
              text: "AI Detection",
              heading: docx.HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            new docx.Paragraph({
              text: report.aiDetection,
              spacing: { after: 200 },
            }),

            new docx.Paragraph({
              text: "Improvement Suggestions",
              heading: docx.HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            new docx.Paragraph({
              text: report.suggestions,
              spacing: { after: 200 },
            }),

            new docx.Paragraph({
              text: `Overall Score: ${report.overallScore}/10`,
              heading: docx.HeadingLevel.HEADING_2,
              spacing: { before: 400 },
            }),
          ],
        },
      ],
    })

    // Generate the document as a buffer
    const buffer = await docx.Packer.toBuffer(doc)

    // Return the document as a blob
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=code-analysis-report.docx",
      },
    })
  } catch (error) {
    console.error("Error generating DOCX:", error)
    return NextResponse.json({ error: "Failed to generate DOCX: " + (error as Error).message }, { status: 500 })
  }
}

