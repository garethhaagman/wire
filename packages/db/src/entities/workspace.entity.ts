import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * Mirrors internal-docs/data-model/data-model.md `workspaces` table.
 * Used by the TypeORM migration CLI only — runtime queries go through repositories/workspaces.ts.
 */
@Entity({ name: "workspaces" })
export class WorkspaceEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Index()
  @Column({ name: "org_id", type: "text" })
  orgId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ name: "data_region", type: "text", default: "us" })
  dataRegion!: string;

  @Column({ type: "jsonb", default: () => "'{}'" })
  policies!: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
