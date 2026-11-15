import { z } from "zod";

/** Metadata encrypted inside the existing CapturaSnapshot/checkpoint contract. */
export const CronicaSnapshotMetadataSchema = z.object({
  mode: z.enum(["dictado", "cronica"]).optional(),
  autoPublish: z.boolean().optional(),
  publicationIntentId: z.string().uuid().optional(),
  eventTime: z.string().max(180).nullable().optional(),
  capturedAt: z.string().datetime({ offset: true }).optional(),
});

export type CronicaSnapshotMetadata = z.infer<typeof CronicaSnapshotMetadataSchema>;
