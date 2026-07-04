import { expect, test } from "@playwright/test";

test("reporting MVP shell supports catalog, credentials, and uploads", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Stack API Utilities" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Tag Report" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run Tag Report" })).toBeVisible();

  await page.getByRole("button", { name: "Credentials" }).click();
  await expect(page.getByRole("heading", { name: "Session Credentials" })).toBeVisible();
  await expect(page.getByLabel("Instance URL")).toBeVisible();

  await page.getByRole("button", { name: "Uploads" }).click();
  await expect(page.getByRole("heading", { name: "Uploads" })).toBeVisible();
  await expect(page.getByLabel("Upload report outputs")).toBeVisible();
});
