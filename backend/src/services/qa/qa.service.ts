import type { QaRequest, QaResponse } from '@ai-toon/shared';
import { webSearchService } from '../webSearch/webSearch.service.js';
import { getAiProvider } from '../ai/provider.factory.js';
import { config } from '../../config/env.js';

export class QaService {
  /**
   * Responds to educational questions using story context and verified web citations
   */
  public async answerQuestion(request: QaRequest): Promise<QaResponse> {
    const question = request.question?.trim();
    if (!question) {
      throw new Error('Please provide an educational question.');
    }

    // 1. Query verified sources via WebSearchService
    const searchQuery = request.topic ? `${request.topic} ${question}` : question;
    const searchResponse = await webSearchService.search(searchQuery, 1, 4);

    const verifiedSources = searchResponse.results.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));

    // 2. Build context from story and search sources
    const storyContextText = request.storyContext ? `\nLesson Context:\n${request.storyContext}\n` : '';
    const sourceContextText =
      verifiedSources.length > 0
        ? `\nVerified Web Research Evidence:\n${verifiedSources
            .map((s, idx) => `[Source ${idx + 1}: ${s.title}] (${s.url})\n${s.snippet}`)
            .join('\n\n')}\n`
        : '';

    const aiProvider = getAiProvider();

    // 3. If AI provider is active, ask Gemini with grounding instructions
    if (aiProvider.isConfigured()) {
      try {
        const prompt = `You are AI Toon Educational Tutor, a friendly, accurate teacher for students.
Answer the following student question accurately, clearly, and engagingly.

Student Question: "${question}"
Target Language: ${request.language || 'en'}
Target Learning Level: ${request.difficulty || 'intermediate'}
${storyContextText}
${sourceContextText}

Instructions:
1. Provide a direct, factual answer first (1-2 clear sentences).
2. Follow with a concise, easy-to-understand explanation.
3. Provide a helpful real-world example or memorable analogy.
4. If using external facts, only cite the provided verified sources. Never invent URLs or facts.
5. If uncertain or evidence is insufficient, honestly state the uncertainty.

Required JSON format:
{
  "answer": "Direct factual answer to the question.",
  "explanation": "Clear educational breakdown of why this happens.",
  "example": "A relatable real-world example or analogy."
}
Return ONLY valid JSON.`;

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiProvider.model}:generateContent?key=${config.aiApiKey}`;
        const aiRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3, // low temperature for high factual accuracy
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (aiRes.ok) {
          const json = (await aiRes.json()) as any;
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            const parsed = JSON.parse(cleanText);

            return {
              question,
              answer: parsed.answer || 'Here is the verified explanation for your question.',
              explanation: parsed.explanation || '',
              example: parsed.example || '',
              sources: verifiedSources.map((s) => ({ title: s.title, url: s.url })),
            };
          }
        }
      } catch (err) {
        console.warn('[QaService] AI generation error, falling back to grounded search synthesis:', err);
      }
    }

    // 4. Grounded Rule-Based Fallback using verified search snippet and story context
    let directAnswer = '';
    let explanation = '';
    let example = '';

    if (verifiedSources.length > 0) {
      directAnswer = verifiedSources[0].snippet.split('.')[0] + '.';
      explanation = verifiedSources[0].snippet;
      example = `For example, in ${verifiedSources[0].title}, this principle can be observed in action.`;
    } else if (request.storyContext) {
      directAnswer = `Based on your lesson, here is the key concept:`;
      explanation = request.storyContext.slice(0, 300) + '...';
      example = 'Review the educational diagrams and points above for a step-by-step walkthrough.';
    } else {
      directAnswer = `Educational guide for: "${question}"`;
      explanation = 'Consult your lesson points and verified reference links for in-depth educational coverage.';
      example = 'Try searching with specific terms for more detailed references.';
    }

    return {
      question,
      answer: directAnswer,
      explanation,
      example,
      sources: verifiedSources.map((s) => ({ title: s.title, url: s.url })),
    };
  }
}

export const qaService = new QaService();
