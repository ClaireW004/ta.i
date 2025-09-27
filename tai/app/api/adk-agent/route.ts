import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

interface AgentTask {
  id: string
  type: "analyze_content" | "check_pacing" | "evaluate_focus" | "generate_suggestions"
  payload: any
  timestamp: number
}

interface AgentResponse {
  type: "suggestion" | "warning" | "insight"
  message: string
  priority: "low" | "medium" | "high"
  source: "focus" | "pacing" | "content" | "general"
}

export async function POST(request: NextRequest) {
  try {
    const { tasks, context } = await request.json()

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ responses: [] })
    }

    const responses: AgentResponse[] = []

    for (const task of tasks) {
      try {
        const agentResponse = await processAgentTask(task, context)
        if (agentResponse) {
          responses.push(agentResponse)
        }
      } catch (error) {
        console.error(`[v0] Failed to process task ${task.id}:`, error)
      }
    }

    return NextResponse.json({ responses })
  } catch (error) {
    console.error("[v0] ADK agent error:", error)
    return NextResponse.json({ error: "Failed to process agent tasks" }, { status: 500 })
  }
}

async function processAgentTask(task: AgentTask, context: any): Promise<AgentResponse | null> {
  const { type, payload } = task
  const { currentSlide, sessionData } = context

  const { text } = await generateText({
    model: "openai/gpt-5-mini",
    prompt: `You are an advanced presentation coaching AI agent. Analyze the task and provide a single, actionable insight.

TASK TYPE: ${type}
TASK DATA: ${JSON.stringify(payload)}

PRESENTATION CONTEXT:
Current Slide: ${currentSlide?.title || "Unknown"}
Slide Content: ${currentSlide?.content || "No content"}
Key Points: ${currentSlide?.bullets?.join(", ") || "No key points"}

SESSION METRICS:
Total Words: ${sessionData?.totalWords || 0}
Average WPM: ${sessionData?.avgWpm || 0}
Focus Score: ${sessionData?.focusScore || 0}%
Pacing Score: ${sessionData?.pacingScore || 0}%

AGENT INSTRUCTIONS:
Based on the task type, provide ONE specific insight:

- analyze_content: Evaluate content quality and alignment with slide
- check_pacing: Assess speaking rhythm and timing
- evaluate_focus: Check content focus and topic adherence  
- generate_suggestions: Provide actionable improvement recommendations

Respond in JSON format:
{
  "type": "suggestion|warning|insight",
  "message": "specific actionable message (max 60 chars)",
  "priority": "low|medium|high",
  "source": "focus|pacing|content|general"
}

Focus on the most important insight. Be specific and actionable.`,
    maxOutputTokens: 300,
  })

  try {
    const response = JSON.parse(text)

    // Validate response structure
    if (response.message && response.type && response.priority && response.source) {
      return response as AgentResponse
    }
  } catch (parseError) {
    console.error("[v0] Failed to parse agent response:", parseError)
  }

  // Fallback response based on task type
  return generateFallbackResponse(type, payload)
}

function generateFallbackResponse(taskType: string, payload: any): AgentResponse {
  switch (taskType) {
    case "analyze_content":
      return {
        type: "suggestion",
        message: "Elaborate on key slide points for clarity",
        priority: "medium",
        source: "content",
      }

    case "check_pacing":
      if (payload.pacingScore < 60) {
        return {
          type: "warning",
          message: "Adjust speaking pace for better flow",
          priority: "high",
          source: "pacing",
        }
      }
      break

    case "evaluate_focus":
      if (payload.focusScore < 70) {
        return {
          type: "warning",
          message: "Refocus on current slide content",
          priority: "high",
          source: "focus",
        }
      }
      break

    case "generate_suggestions":
      return {
        type: "suggestion",
        message: "Consider adding examples to illustrate points",
        priority: "low",
        source: "general",
      }
  }

  return {
    type: "insight",
    message: "Continue with current presentation approach",
    priority: "low",
    source: "general",
  }
}
