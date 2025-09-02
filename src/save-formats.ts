import { z } from "zod/v3"
export type PushFarmZone = z.TypeOf<typeof PushFarmZoneSchema>;

export const PushFarmZoneSchema = z.object({
        farmDustPerSec: z.optional(z.number()),
        farmItems: z.optional(z.array(z.string())),
        pushEnemiesPerMin: z.optional(z.number()),
        pushItems: z.optional(z.array(z.string())),
    });

export type PushFarmSave = z.TypeOf<typeof PushFarmSaveSchema>;

export const PushFarmSaveSchema = z.record(z.string().regex(/^\d+$/), PushFarmZoneSchema);