import { z } from "zod";

export const OpenCodeEventSchema = z.object({
    type: z.string(),
    part: z
        .object({
            text: z.string().optional(),
            reason: z.string().optional()
        })
        .optional()
});

export const OpenCodeOutputSchema = z.array(OpenCodeEventSchema);

export type OpenCodeEvent = z.infer<typeof OpenCodeEventSchema>;
