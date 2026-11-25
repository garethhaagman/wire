import { anthropic } from "@ai-sdk/anthropic";
import type { ApiEnv } from "@wire/config";
import type { LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

const MODEL_ID = "claude-sonnet-5";

/**
 * Zero-dependency default: no ANTHROPIC_API_KEY means every agent run still works
 * end-to-end (run creation, step/trace storage, channel reply) against a canned
 * response instead of a real model call. Set ANTHROPIC_API_KEY to switch to Claude —
 * generateText()'s call shape doesn't change either way, only the model passed in.
 */
export function selectModel(env: ApiEnv): LanguageModel {
  if (env.ANTHROPIC_API_KEY) {
    return anthropic(MODEL_ID);
  }

  return new MockLanguageModelV4({
    // biome-ignore lint/suspicious/useAwait: doGenerate's contract is always async (PromiseLike)
    doGenerate: async (options) => {
      const prompt = options.prompt
        .flatMap((message) => {
          if (message.role === "system") {
            return [message.content];
          }
          if (message.role === "user") {
            return message.content.map((part) =>
              part.type === "text" ? part.text : ""
            );
          }
          return [];
        })
        .join(" ")
        .trim();

      return {
        content: [{ type: "text", text: `[mock] ${prompt}` }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: {
            total: undefined,
            noCache: undefined,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {
            total: undefined,
            text: undefined,
            reasoning: undefined,
          },
        },
        warnings: [],
      };
    },
  });
}
