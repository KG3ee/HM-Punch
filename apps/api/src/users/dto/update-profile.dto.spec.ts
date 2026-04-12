import { UpdateProfilePhotoDto } from "./update-profile.dto";

describe("UpdateProfilePhotoDto.isValid", () => {
  it("accepts https image URLs", () => {
    expect(
      UpdateProfilePhotoDto.isValid("https://cdn.hmpunch.com/profile/jordan.png"),
    ).toBe(true);
  });

  it("accepts safe raster image data URLs", () => {
    expect(
      UpdateProfilePhotoDto.isValid("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"),
    ).toBe(true);
  });

  it("rejects svg data URLs", () => {
    expect(
      UpdateProfilePhotoDto.isValid("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
    ).toBe(false);
  });

  it("rejects javascript URLs", () => {
    expect(UpdateProfilePhotoDto.isValid("javascript:alert(1)")).toBe(false);
  });
});
