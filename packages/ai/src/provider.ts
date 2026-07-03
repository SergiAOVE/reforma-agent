export type AiProviderName = "mock" | "openai" | "anthropic";

export type TextDraftRequest = {
  readonly prompt: string;
  readonly input: string;
};

export type TextDraftResponse = {
  readonly provider: AiProviderName;
  readonly content: string;
};

export type AiProvider = {
  readonly name: AiProviderName;
  generateTextDraft(request: TextDraftRequest): Promise<TextDraftResponse>;
};
