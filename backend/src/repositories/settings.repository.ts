import type { Prisma } from "../generated/prisma/client";
import type { Db } from "../lib/prisma";

export class SettingsRepository {
  constructor(private readonly db: Db) {}

  all() {
    return this.db.systemSetting.findMany();
  }

  upsert(key: string, value: Prisma.InputJsonValue) {
    return this.db.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
}
