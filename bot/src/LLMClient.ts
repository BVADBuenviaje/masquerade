import Groq from 'groq-sdk';
import { Player } from '@masquerade/shared';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from the bot root directory just to be bulletproof
dotenv.config({ path: path.join(__dirname, '..', '..', 'bot', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let groqClient: Groq | null = null;

function getModel() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY || '';
    if (!apiKey) return null;
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * Sanitizes the LLM output by trimming whitespace, newlines, and trailing punctuation.
 */
function sanitizeOutput(text: string): string {
  return text.trim().replace(/[.,!?]+$/, '').replace(/\n/g, '');
}

export class LLMClient {
  private static async generateWithRetry(systemPrompt: string, userPrompt: string, jsonMode: boolean = false, maxRetries = 3): Promise<string> {
    const aiClient = getModel();
    if (!aiClient) throw new Error("Model not initialized");

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await aiClient.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'llama-3.1-8b-instant',
          max_tokens: jsonMode ? 50 : 10,
          temperature: 0.7,
          response_format: jsonMode ? { type: "json_object" } : { type: "text" }
        });
        return result.choices[0]?.message?.content || "";
      } catch (err) {
        console.error(`LLM generation attempt ${i + 1} failed:`, err);
        if (i === maxRetries - 1) throw err;
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
      }
    }
    return "";
  }

  static async generateClue(
    role: string,
    secretWord: string,
    wordHistory: string[]
  ): Promise<string> {
    const aiClient = getModel();
    if (!aiClient) {
      console.warn("GROQ_API_KEY not set! Falling back to default clue.");
      return "hmm";
    }

    const historyStr = wordHistory.length > 0 ? wordHistory.join(", ") : "None yet";

    let systemPrompt = "";
    let userPrompt = "";
    if (role === 'Impostor') {
      systemPrompt = "You are playing Masquerade. You are the IMPOSTOR. Constraint: Respond with EXACTLY one word. No punctuation, no markdown, no extra text.";
      userPrompt = `You do NOT know the secret word.
Previous clues given by players: ${historyStr}.
Provide a single-word clue that blends in with the others and makes sense given the context.`;
    } else {
      systemPrompt = "You are playing Masquerade. You are an INNOCENT. Constraint: Respond with EXACTLY one word. No punctuation, no markdown, no extra text.";
      userPrompt = `The secret word is '${secretWord}'.
Previous clues given by players: ${historyStr}.
Provide a single-word clue that proves you know the word without making it too obvious for the Impostor.`;
    }

    try {
      const responseText = await this.generateWithRetry(systemPrompt, userPrompt, false);
      return sanitizeOutput(responseText);
    } catch (err) {
      console.error("Error generating clue after retries:", err);
      return "hmm";
    }
  }

  static async generateVote(
    role: string,
    players: Player[],
    wordHistory: { playerId: string; word: string }[],
    suspicionMap: Record<string, number> = {}
  ): Promise<{ targetId: string, reasoning: string }> {
    const aiClient = getModel();
    if (!aiClient) {
      console.warn("GROQ_API_KEY not set! Falling back to first player's vote.");
      return { targetId: players[0]?.id || "", reasoning: "Fallback due to missing API key." };
    }

    const playerList = players.map(p => `- ${p.name} (ID: ${p.id})`).join("\n");
    const cluesList = wordHistory.map(entry => {
      const p = players.find(p => p.id === entry.playerId);
      return `${p?.name || entry.playerId}: ${entry.word}`;
    }).join("\n");

    const suspicionList = Object.entries(suspicionMap).map(([id, score]) => {
      const pName = players.find(p => p.id === id)?.name || id;
      return `${pName}: ${score}`;
    }).join("\n");

    let systemPrompt = "";
    let userPrompt = "";
    if (role === 'Impostor') {
      systemPrompt = "You are playing Masquerade. You are the IMPOSTOR. Constraint: Output a valid JSON object containing 'reasoning' (your brief internal monologue) and 'targetId' (the player ID to vote for). Example: {\"reasoning\": \"I need to deflect suspicion.\", \"targetId\": \"<PLAYER_ID>\"}. You must NEVER vote for yourself. Keep the response concise.";
      userPrompt = `The other players are trying to vote you out.
Analyze the clues:
${cluesList}

Current Suspicion Levels (higher means more suspicious):
${suspicionList || "None"}

Pick one Innocent player ID from this list to vote for to deflect suspicion and blend in:
${playerList}`;
    } else {
      systemPrompt = "You are playing Masquerade. It is time to vote for the Impostor. Constraint: Output a valid JSON object containing 'reasoning' (your brief internal monologue about who is most suspicious and why) and 'targetId' (the player ID to vote for). Example: {\"reasoning\": \"Their clue was weird.\", \"targetId\": \"<PLAYER_ID>\"}. You must NEVER vote for yourself. Keep the response concise.";
      userPrompt = `Players:
${playerList}

Clues given:
${cluesList}

Current Suspicion Levels (higher means more suspicious):
${suspicionList || "None"}

Analyze the clues and suspicion levels to find the player who gave a suspicious or disjointed clue. Output your JSON vote.`;
    }

    try {
      const responseText = await this.generateWithRetry(systemPrompt, userPrompt, true);
      try {
        // Strip out markdown code blocks if the LLM adds them
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        let foundId = parsed.targetId || parsed.vote;
        
        // Try mapping name to ID if it returned a name instead of ID
        if (foundId && !players.find(p => p.id === foundId)) {
          const matchedPlayer = players.find(p => p.name.toLowerCase() === foundId.toLowerCase());
          if (matchedPlayer) foundId = matchedPlayer.id;
        }

        return { 
          targetId: foundId || players[0]?.id || "", 
          reasoning: parsed.reasoning || "No reasoning provided." 
        };
      } catch (e) {
        // Fallback to regex extraction if JSON parsing fails for any reason
        const match = responseText.match(/"targetId"\s*:\s*"([^"]+)"/);
        const matchOld = responseText.match(/"vote"\s*:\s*"([^"]+)"/);
        return { 
          targetId: (match && match[1]) || (matchOld && matchOld[1]) || players[0]?.id || "", 
          reasoning: "Failed to parse reasoning." 
        };
      }
    } catch (err) {
      console.error("Error generating vote after retries:", err);
      return { targetId: players[0]?.id || "", reasoning: "Generation failed." };
    }
  }
}
