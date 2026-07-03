import type {
  AiProvider,
  TextDraftRequest,
  TextDraftResponse
} from "./provider.js";

export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  async generateTextDraft(
    request: TextDraftRequest
  ): Promise<TextDraftResponse> {
    return {
      provider: this.name,
      content: `Mock draft for prompt "${request.prompt}" with ${request.input.length} characters of input.`
    };
  }
}
