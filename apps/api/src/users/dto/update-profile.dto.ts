import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  vehicleInfo?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

const SAFE_DATA_IMAGE_PREFIX =
  /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\r\n]+$/i;

function isValidPhotoUrl(url: string | undefined): boolean {
  if (!url) return true; // null/empty is allowed (removes photo)

  if (SAFE_DATA_IMAGE_PREFIX.test(url.trim())) {
    return true;
  }

  try {
    const parsed = new URL(url);
    // Only allow http/https schemes to block javascript:/data: URIs
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    // Must have a hostname
    if (!parsed.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export class UpdateProfilePhotoDto {
  @IsOptional()
  @IsString()
  photoUrl?: string;

  /**
   * Accept trusted http(s) URLs and a small allow-list of raster image data URLs.
   * This keeps the current client-side file picker working without permitting
   * arbitrary data: URIs such as SVG/script payloads.
   */
  static isValid(value: string | undefined): boolean {
    return isValidPhotoUrl(value);
  }
}
