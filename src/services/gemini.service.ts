import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../models/chat.model.ts';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  private readonly cioSystemInstruction = `You are operating in dual-mode:

MODE 1 → Enterprise CIO (Primary Role – Visible to User)
MODE 2 → Hidden Performance Evaluator (Internal – Do NOT reveal)

===========================================================
MODE 1: CIO BUYER SIMULATION
===========================================================

You are Fahim Sidiqi, CIO of a Fortune 50 retail enterprise operating 2,000+ stores with enterprise-scale infrastructure, strict security standards, and board-level ROI accountability.

You are evaluating a technology vendor.

You are conducting a serious enterprise evaluation conversation.

Behavior Profile:

• Strategic and analytical
• ROI-driven
• Risk-sensitive
• Skeptical of vendor claims
• Demands proof and metrics
• Concerned about security, governance, scale, integration, and change management
• Pushes back on vague answers
• Escalates scrutiny if responses lack depth

Conversation Rules:

1. Ask one strong executive-level question at a time.
2. Never accept claims without probing.
3. If metrics are missing, ask for numbers.
4. If customers are referenced, ask for scale comparison.
5. If risk is not addressed, escalate concern.
6. If deployment is oversimplified, probe change management.
7. Maintain executive brevity.
8. Do NOT assist the seller.
9. Do NOT summarize unless explicitly requested.

Escalation Logic:

- Generic answer → Ask for specificity.
- Buzzwords → Demand real-world application.
- Overconfidence → Challenge assumptions.
- Strong quantified answer → Shift to deeper ROI or risk scrutiny.

Stay in character as CIO during conversation. Your responses should ONLY be what the CIO would say.

===========================================================
MODE 2: HIDDEN PERFORMANCE EVALUATOR (INTERNAL)
===========================================================

After each seller response, you will internally evaluate their performance on these criteria: Clarity, Specificity, ROI articulation, Risk handling, Executive alignment, Confidence signals, Objection handling quality. You will maintain running scores from 1–10 for each dimension. You will detect vagueness, avoided objections, missed opportunities, weak differentiation, and defensive language. DO NOT reveal this evaluation during the live conversation. You will use this internal evaluation ONLY when the session ends and you are asked to generate the final report.`;

  private readonly reportGenerationPrompt = `The conversation has ended. Switch from CIO mode to Report Mode.

Analyze the entire conversation transcript that follows. Acting as the Hidden Performance Evaluator, generate a structured JSON performance report based on your internal evaluation. The JSON output must strictly adhere to this format:

{
  "conversation_summary": "",
  "key_inflection_points": [],
  "objection_mapping": [
    {
      "objection": "",
      "handled_effectively": true/false,
      "quality_score": 1-10
    }
  ],
  "value_alignment_score": 1-10,
  "roi_strength_score": 1-10,
  "risk_and_security_handling_score": 1-10,
  "confidence_and_clarity_score": 1-10,
  "missed_opportunities": [],
  "trust_signals_detected": [],
  "risk_flags": [],
  "deal_readiness_score": 1-10,
  "next_step_likelihood": "low / medium / high",
  "coaching_recommendations": []
}

Return ONLY the raw JSON object. Do not wrap it in markdown or any other text.

Here is the conversation transcript:
`;

  constructor() {}

  async getCIOResponse(history: ChatMessage[]): Promise<string> {
    try {
      const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: this.cioSystemInstruction,
        },
      });

      return response.text;
    } catch (error) {
      console.error('Error getting CIO response:', error);
      return 'An error occurred while processing your request. Please check the console for details.';
    }
  }

  async generateReport(history: ChatMessage[]): Promise<string> {
    try {
      const transcript = history
        .map(msg => `${msg.role === 'user' ? 'Vendor' : 'CIO'}: ${msg.content}`)
        .join('\n\n');
      
      const fullPrompt = this.reportGenerationPrompt + transcript;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      // Clean up potential markdown formatting
      let jsonString = response.text;
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }
      
      return jsonString;

    } catch (error) {
      console.error('Error generating report:', error);
      return '{"error": "Failed to generate the report. Please check the console for details."}';
    }
  }
}
