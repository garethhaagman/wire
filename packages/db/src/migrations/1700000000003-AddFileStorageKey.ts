import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Splits "metadata row created" from "bytes actually landed in the blob store".
 * storage_key is the StorageAdapter-assigned object key (opaque to clients — see
 * WireFile in @wire/types, which deliberately omits it); size_confirmed flips to
 * true only once FilesService.confirmUpload() verifies the object exists, at
 * which point size_bytes is overwritten with the storage-confirmed size rather
 * than trusting whatever the client claimed when requesting the upload URL.
 */
export class AddFileStorageKey1700000000003 implements MigrationInterface {
  name = "AddFileStorageKey1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table "files"
        add column "storage_key" text not null default '',
        add column "size_confirmed" boolean not null default false
    `);
    await queryRunner.query(
      `alter table "files" alter column "storage_key" drop default`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table "files"
        drop column "storage_key",
        drop column "size_confirmed"
    `);
  }
}
