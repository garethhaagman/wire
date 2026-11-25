import { SetMetadata } from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";

export const DEPRECATED_METADATA_KEY = "wire:deprecated";

export interface DeprecationMetadata {
  /** Unix timestamp (seconds) the route became deprecated. */
  since: number;
  /** ISO 8601 date the route stops being served. */
  sunset: string;
  /** Migration documentation URL. */
  migrationUrl: string;
}

/**
 * Marks a route as deprecated. The deprecation-headers interceptor reads this
 * metadata and sets Deprecation/Sunset/Link on every response from the route —
 * RFC 9745 / RFC 8594, see internal-docs/api/versioning.md.
 *
 * Usage: @Deprecated({ since: 1798761600, sunset: "2027-06-30", migrationUrl: "https://docs.wire.example/migrations/v1-workspaces" })
 */
export function Deprecated(metadata: DeprecationMetadata) {
  return (target: object, key?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(DEPRECATED_METADATA_KEY, metadata)(
      target,
      key as string,
      descriptor as PropertyDescriptor,
    );
    ApiHeader({
      name: "Deprecation",
      description: "RFC 9745 deprecation marker; see Sunset and Link headers for details.",
      required: false,
    })(target, key as string, descriptor as PropertyDescriptor);
  };
}
