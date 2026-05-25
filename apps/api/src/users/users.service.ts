import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB_TOKEN, type Db } from "../db/db.module";
import { users, type UserRow } from "../db/schema";

@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }
}
