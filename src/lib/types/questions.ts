import { z } from 'zod';

const optionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });

export const questionConfigSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('choice'), options: z.array(optionSchema).min(2) }),
	z.object({ kind: z.literal('multiple_choice'), options: z.array(optionSchema).min(2), minimumSelections: z.number().int().min(0).optional(), maximumSelections: z.number().int().positive().optional() }),
	z.object({ kind: z.literal('matching'), left: z.array(optionSchema).min(1), right: z.array(optionSchema).min(1) }),
	z.object({ kind: z.literal('ordering'), items: z.array(optionSchema).min(2) }),
	z.object({ kind: z.literal('short_text'), multiline: z.boolean().default(false), maximumLength: z.number().int().positive().optional() })
]);

export const gradingRuleSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('choice'), correctOptionId: z.string().min(1) }),
	z.object({ kind: z.literal('multiple_choice'), correctOptionIds: z.array(z.string().min(1)).min(1), allOrNothing: z.boolean().default(true) }),
	z.object({ kind: z.literal('matching'), pairs: z.array(z.object({ leftId: z.string().min(1), rightId: z.string().min(1) })).min(1) }),
	z.object({ kind: z.literal('ordering'), correctOrder: z.array(z.string().min(1)).min(2) }),
	z.object({ kind: z.literal('short_text'), acceptedAnswers: z.array(z.string().min(1)).default([]), criteria: z.array(z.string().min(1)).min(1), aiEligible: z.boolean().default(false) })
]);

export const answerPayloadSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('choice'), optionId: z.string().min(1) }),
	z.object({ kind: z.literal('multiple_choice'), optionIds: z.array(z.string().min(1)) }),
	z.object({ kind: z.literal('matching'), pairs: z.array(z.object({ leftId: z.string().min(1), rightId: z.string().min(1) })) }),
	z.object({ kind: z.literal('ordering'), itemIds: z.array(z.string().min(1)) }),
	z.object({ kind: z.literal('short_text'), text: z.string() })
]);

export type QuestionConfig = z.infer<typeof questionConfigSchema>;
export type GradingRule = z.infer<typeof gradingRuleSchema>;
export type AnswerPayload = z.infer<typeof answerPayloadSchema>;
