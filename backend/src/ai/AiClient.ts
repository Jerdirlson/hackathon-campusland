import OpenAI from 'openai'

export class AiClient {
  private _systemPrompt: string = ''
  private _context: object = {}
  private _responseSchema: object | null = null
  private _model: string = 'gpt-4o-mini'

  systemPrompt(prompt: string): this {
    this._systemPrompt = prompt
    return this
  }

  context(ctx: object): this {
    this._context = ctx
    return this
  }

  responseSchema(schema: object): this {
    this._responseSchema = schema
    return this
  }

  model(m: string): this {
    this._model = m
    return this
  }

  async infer<T>(): Promise<T> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (this._systemPrompt) {
      messages.push({ role: 'system', content: this._systemPrompt })
    }

    messages.push({ role: 'user', content: JSON.stringify(this._context) })

    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this._model,
      messages,
    }

    if (this._responseSchema) {
      params.response_format = {
        type: 'json_schema',
        json_schema: this._responseSchema as any,
      }
    } else {
      params.response_format = { type: 'json_object' }
    }

    const completion = await openai.chat.completions.create(params)

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('OpenAI returned empty content')
    }

    return JSON.parse(content) as T
  }
}
