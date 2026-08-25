import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/server/http";

export type ModelTask =
  | "topic_extract"
  | "topic_merge"
  | "guide"
  | "grounding_verify"
  | "quick_check"
  | "question_verify";

const modelKeys: Record<ModelTask, keyof Pick<ReturnType<typeof getServerEnv>,
  | "MODEL_TOPIC_EXTRACT"
  | "MODEL_TOPIC_MERGE"
  | "MODEL_GUIDE"
  | "MODEL_GROUNDING_VERIFY"
  | "MODEL_QUICK_CHECK"
  | "MODEL_QUESTION_VERIFY"
>> = {
  topic_extract: "MODEL_TOPIC_EXTRACT",
  topic_merge: "MODEL_TOPIC_MERGE",
  guide: "MODEL_GUIDE",
  grounding_verify: "MODEL_GROUNDING_VERIFY",
  quick_check: "MODEL_QUICK_CHECK",
  question_verify: "MODEL_QUESTION_VERIFY",
};

export type StructuredResult<T> = {
  data: T;
  provider: "openai";
  configuredModel: string;
  actualModel: string;
  usage: unknown;
};

export class ModelGateway {
  private client: OpenAI;
  private env = getServerEnv();

  constructor() {
    this.client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
      baseURL: this.env.OPENAI_BASE_URL,
    });
  }

  async generateStructured<T>({
    task,
    schema,
    schemaName,
    instructions,
    evidence,
  }: {
    task: ModelTask;
    schema: ZodType<T>;
    schemaName: string;
    instructions: string;
    evidence: string;
  }): Promise<StructuredResult<T>> {
    const configuredModel = this.env[modelKeys[task]];
    try {
      const response = await this.client.responses.parse({
        model: configuredModel,
        instructions,
        input: evidence,
        text: { format: zodTextFormat(schema, schemaName) },
      });
      if (!response.output_parsed) {
        throw new AppError("MODEL_EMPTY_OUTPUT", "The model did not return a structured result.", 502);
      }
      return {
        data: schema.parse(response.output_parsed),
        provider: "openai",
        configuredModel,
        actualModel: response.model,
        usage: response.usage,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : "Unknown model error";
      throw new AppError("MODEL_GENERATION_FAILED", `Structured model generation failed: ${message}`, 502);
    }
  }
}
