import { test, expect } from "@playwright/test";

test.describe("DirApp Web Usability & Routing Integrity", () => {
  // 1. Landing Page Test
  test("should load the landing page successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DirApp/);
    
    // Check that primary branding and action buttons are visible
    const brandHeader = page.locator("nav").getByText("DirApp");
    await expect(brandHeader).toBeVisible();

    const loginBtn = page.getByRole("link", { name: "כניסה למערכת" });
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toHaveAttribute("href", "/login");
  });

  // 2. Navigation to Login Page
  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "כניסה למערכת" }).click();
    await page.waitForURL("**/login");
    
    const loginHeader = page.getByRole("heading", { name: "ברוכים הבאים" });
    await expect(loginHeader).toBeVisible();
  });

  // 3. Authenticated Navigation Links Verification (Routings Integrity)
  test("should access dashboard and verify routes load successfully without 404s", async ({ page }) => {
    // Inject mock token and mock user into localStorage to bypass Auth Gating
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("dirapp_token", "header.eyJleHAiOjk5OTk5OTk5OTl9.signature");
    });

    // Mock API requests so the app doesn't crash on network failures
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-123",
            email: "landlord@dirapp.co.il",
            firstName: "ישראל",
            lastName: "ישראלי",
            role: "landlord",
            activeRole: "landlord",
            kycStatus: "APPROVED",
            trustScore: 95,
            tosAcceptedAt: new Date().toISOString(),
            whatsappOptIn: true,
          },
        }),
      });
    });

    // Mock other dashboard endpoints
    await page.route("**/api/landlord/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: { totalListings: 1, activeListings: 1, totalViews: 400, totalLikes: 20, conversionRate: "5%" },
          listings: [],
          recentPendingMatches: [],
        }),
      });
    });

    await page.route("**/api/contracts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ contracts: [] }),
      });
    });

    await page.route("**/api/v3/contracts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ agreements: [] }),
      });
    });

    // Visit dashboard
    await page.goto("/dashboard");
    
    // Verify user is logged in
    const welcomeHeader = page.getByText("שלום, ישראל ישראלי");
    await expect(welcomeHeader).toBeVisible();

    // Verify list of critical sidebar navigation links load cleanly (no 404s)
    const routesToCheck = [
      { path: "/search", text: "חיפוש דירות" },
      { path: "/matches", text: "לידים והתאמות" },
      { path: "/payments", text: "תשלומים" },
      { path: "/maintenance", text: "תחזוקה" },
      { path: "/properties", text: "ניהול נכסים" },
      { path: "/chat", text: "הודעות" },
      { path: "/contracts", text: "חוזים" },
    ];

    for (const route of routesToCheck) {
      await page.goto(route.path);
      // Verify that the placeholder page exists and has the expected text (proving status 200)
      const pageHeader = page.getByRole("heading", { name: route.text }).first();
      await expect(pageHeader).toBeVisible();
    }
  });

  // 4. Contract Upload workflow redirection test
  test("should navigate to contract upload screen and display file dropzone", async ({ page }) => {
    // Inject mock token and mock user
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("dirapp_token", "header.eyJleHAiOjk5OTk5OTk5OTl9.signature");
    });

    // Mock api
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-123",
            email: "landlord@dirapp.co.il",
            firstName: "ישראל",
            lastName: "ישראלי",
            role: "landlord",
            activeRole: "landlord",
            kycStatus: "APPROVED",
            trustScore: 95,
            tosAcceptedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route("**/api/contracts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ contracts: [] }),
      });
    });

    await page.route("**/api/v3/contracts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ agreements: [] }),
      });
    });

    await page.route("**/api/landlord/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ listings: [] }),
      });
    });

    await page.goto("/contracts");
    
    // Click upload contract button
    const uploadBtn = page.getByRole("link", { name: "העלאת חוזה" }).first();
    await expect(uploadBtn).toBeVisible();
    await uploadBtn.click();

    // Verify upload file step loads
    await page.waitForURL("**/contracts/upload");
    const uploadHeader = page.getByRole("heading", { name: "העלאת חוזה" }).first();
    await expect(uploadHeader).toBeVisible();

    const dropzoneText = page.getByText("לחץ לבחירת קובץ");
    await expect(dropzoneText).toBeVisible();
  });
});
