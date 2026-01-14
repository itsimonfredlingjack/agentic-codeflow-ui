import { z } from 'zod';

export const OllamaChatRoleSchema = z.enum(['system', 'user', 'assistant']);

export const OllamaChatMessageSchema = z.object({
  role: OllamaChatRoleSchema,
  content: z.string(),
});

export const OllamaOptionsSchema = z.record(z.string(), z.unknown()).optional().refine(
  (val) => val === undefined || (typeof val === 'object' && !Array.isArray(val)),
  { message: "Options must be an object and not an array" }
);

export const OllamaGenerateBodySchema = z.object({
  action: z.literal('generate'),
  model: z.string().optional(),
  prompt: z.string().min(1, "Prompt must be a non-empty string"),
  options: OllamaOptionsSchema,
  messages: z.undefined().optional(), // Should not exist or be undefined
});

export const OllamaChatBodySchema = z.object({
  action: z.literal('chat'),
  model: z.string().optional(),
  messages: z.array(OllamaChatMessageSchema).min(1, "Messages must be a non-empty array"),
  options: OllamaOptionsSchema,
  prompt: z.undefined().optional(), // Should not exist or be undefined
});

export const OllamaApiBodySchema = z.discriminatedUnion('action', [
  OllamaGenerateBodySchema,
  OllamaChatBodySchema,
]);

export type OllamaApiBody = z.infer<typeof OllamaApiBodySchema>;
