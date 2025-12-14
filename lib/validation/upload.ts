import { z } from "zod";

export const uploadRequestSchema = z.object({
  file: z.instanceof(File, {
    message: "File is required",
  }),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
