import { describe, it, expect } from "vitest";
import { PERMISSIONS, ALL_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS } from "./permissions";

describe("permission catalog integrity", () => {
  it("every permission has a human-readable label", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(PERMISSION_LABELS[perm]).toBeTruthy();
    }
  });

  it("every permission appears in exactly one UI group", () => {
    const grouped = PERMISSION_GROUPS.flatMap((g) => g.permissions);
    for (const perm of ALL_PERMISSIONS) {
      const count = grouped.filter((p) => p === perm).length;
      expect(count, `${perm} should appear in exactly one group`).toBe(1);
    }
    // and no group references a permission that doesn't exist
    for (const perm of grouped) {
      expect(ALL_PERMISSIONS).toContain(perm);
    }
  });

  it("includes the finance and user-management permissions relied on by admin routes", () => {
    // Regression guard for Phase 0.4: these two were declared in the catalog
    // but had zero enforcing call sites before the RBAC fix.
    expect(PERMISSIONS.MANAGE_FINANCE).toBe("MANAGE_FINANCE");
    expect(PERMISSIONS.MANAGE_USERS).toBe("MANAGE_USERS");
  });
});
