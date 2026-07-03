import { z } from "zod";

import { projectRoleSchema, projectStatusSchema } from "./enums";
import { nonEmptyStringSchema } from "./validators";

/**
 * Form schemas shared by the web UI (client hints) and server actions
 * (authoritative validation). RLS remains the final enforcement layer.
 */

const optionalTrimmedText = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .transform((value) => value ?? null);

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "password must be at least 6 characters"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema.extend({
  fullName: nonEmptyStringSchema.max(120),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const projectFormSchema = z.object({
  name: nonEmptyStringSchema.max(120),
  addressLabel: optionalTrimmedText,
  description: optionalTrimmedText,
});
export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const projectSettingsSchema = projectFormSchema.extend({
  status: projectStatusSchema,
});
export type ProjectSettingsInput = z.infer<typeof projectSettingsSchema>;

export const addMemberSchema = z.object({
  email: z.string().trim().email(),
  role: projectRoleSchema,
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;
