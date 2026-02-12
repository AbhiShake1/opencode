import { test, expect } from "../fixtures"
import { openSidebar, openSidebarThreadMenu, toggleSidebar, withSession } from "../actions"
import {
  sidebarThreadFilterSelector,
  sidebarThreadSortSelector,
  sidebarThreadOrganizeSelector,
  sidebarThreadArchivedToggleSelector,
} from "../selectors"

test("sidebar can be collapsed and expanded", async ({ page, gotoSession }) => {
  await gotoSession()

  await openSidebar(page)

  await toggleSidebar(page)
  await expect(page.locator("main")).toHaveClass(/xl:border-l/)

  await toggleSidebar(page)
  await expect(page.locator("main")).not.toHaveClass(/xl:border-l/)
})

test("sidebar collapsed state persists across navigation and reload", async ({ page, sdk, gotoSession }) => {
  await withSession(sdk, "sidebar persist session 1", async (session1) => {
    await withSession(sdk, "sidebar persist session 2", async (session2) => {
      await gotoSession(session1.id)

      await openSidebar(page)
      await toggleSidebar(page)
      await expect(page.locator("main")).toHaveClass(/xl:border-l/)

      await gotoSession(session2.id)
      await expect(page.locator("main")).toHaveClass(/xl:border-l/)

      await page.reload()
      await expect(page.locator("main")).toHaveClass(/xl:border-l/)

      const opened = await page.evaluate(
        () => JSON.parse(localStorage.getItem("opencode.global.dat:layout") ?? "{}").sidebar?.opened,
      )
      await expect(opened).toBe(false)
    })
  })
})

test("sidebar organize/sort/filter modes persist across reload", async ({ page, gotoSession }) => {
  await gotoSession()
  await openSidebar(page)

  await openSidebarThreadMenu(page)
  await page.locator(sidebarThreadOrganizeSelector("chronological")).first().click({ force: true })

  await openSidebarThreadMenu(page)
  await page.locator(sidebarThreadSortSelector("created_desc")).first().click({ force: true })

  await openSidebarThreadMenu(page)
  await page.locator(sidebarThreadFilterSelector("relevant")).first().click({ force: true })

  await page.reload()

  const sidebar = await page.evaluate(
    () => JSON.parse(localStorage.getItem("opencode.global.dat:layout") ?? "{}").sidebar ?? {},
  )
  await expect(sidebar.organize).toBe("chronological")
  await expect(sidebar.sort).toBe("created_desc")
  await expect(sidebar.filter).toBe("relevant")
})

test("sidebar archive lifecycle includes archived view and unarchive", async ({ page, sdk, gotoSession }) => {
  const title = `sidebar archived lifecycle ${Date.now()}`

  await withSession(sdk, title, async (session) => {
    await gotoSession(session.id)
    await openSidebar(page)
    await openSidebarThreadMenu(page)
    await page.locator(sidebarThreadFilterSelector("all")).first().click({ force: true })

    const row = page.locator(`[data-session-id="${session.id}"]`).first()
    await expect(row).toBeVisible()
    await row.hover()
    await row.getByRole("button", { name: /archive/i }).first().click({ force: true })

    await expect
      .poll(
        async () => {
          const info = await sdk.session.get({ sessionID: session.id }).then((result) => result.data)
          return info?.time?.archived ?? 0
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0)

    await expect(page.locator(`[data-session-id="${session.id}"]`)).toHaveCount(0)

    await openSidebarThreadMenu(page)
    await page.locator(sidebarThreadArchivedToggleSelector).first().click({ force: true })
    await expect(page.locator(`[data-session-id="${session.id}"]`).first()).toBeVisible({ timeout: 30_000 })

    const archivedRow = page.locator(`[data-session-id="${session.id}"]`).first()
    await archivedRow.hover()
    await archivedRow.getByRole("button", { name: /unarchive/i }).first().click({ force: true })

    await expect
      .poll(
        async () => {
          const info = await sdk.session.get({ sessionID: session.id }).then((result) => result.data)
          return info?.time?.archived ?? 0
        },
        { timeout: 30_000 },
      )
      .toBe(0)

    await expect(page.locator(`[data-session-id="${session.id}"]`)).toHaveCount(0)

    await openSidebarThreadMenu(page)
    await page.locator(sidebarThreadArchivedToggleSelector).first().click({ force: true })
    await expect(page.locator(`[data-session-id="${session.id}"]`).first()).toBeVisible({ timeout: 30_000 })
  })
})
