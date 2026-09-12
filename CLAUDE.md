# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Frontend for **Marksly** (rebranded from "Edvanta" — the parent folder name is stale, ignore it) — a multi-tenant SaaS school/campus management system for institutions in Pakistan. Next.js 15 (App Router) + TypeScript, Redux Toolkit + RTK Query, Tailwind (CSS-variable theming).

## Commands

```bash
npm run dev         # next dev
npm run build        # next build
npm start            # next start (production, after build)
npm run lint         # next lint
npm run type-check   # tsc --noEmit — the correctness gate, run after every meaningful change
npm test             # vitest run
```

Run a single test file: `npx vitest run lib/__tests__/role-routes.test.ts`

Set `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api/v1`) to point at the backend (`marksly-api`, a separate sibling repo).

There are very few test files in this repo (`vitest`, jsdom environment) — most correctness checking here is `tsc --noEmit`, not unit tests.

## Architecture

### Route structure

`app/` is the Next.js App Router tree. `(dashboard)` is a route group holding one folder per role's authenticated area: `admin`, `teacher`, `student`, `parent`, `accountant`, `superadmin`, plus `my-id-card` (shared self-service page, not role-specific — see below). `(auth)` and `(exam)` are their own groups. Everything outside those groups (`pricing`, `features`, `blog`, `school-management-system-pakistan`, etc.) is public marketing/SEO content, not app functionality.

Page files under `app/` are thin — they import and render a component from `components/<domain>/`, which is where the actual logic lives. When asked to change a page's behavior, go straight to its `components/` counterpart.

### `components/` is organized by domain, not by page

`students`, `staff`, `academic` (terms + grading), `timetable`, `attendance`, `exams`, `fees` / `fees-online`, `billing`, `subjects`, `classes`, `notices`, `messaging`, `portal` (parent/student self-service views), `superadmin`, `users`, `login-ids`, `settings`, `layout`, `charts`, `theme`, `marketing`, `forms`, `verify`, `brand`. `shared/` holds cross-domain reusable pieces (e.g. `PhotoUpload.tsx`, `PrintAllCardsDialog.tsx`, `cardDownload.ts`, `IdCardMissingFieldsBanner.tsx`, `MyIdCardView.tsx`) — check there before building something that feels like it should already exist. `ui/` is the design-system primitive layer (see below) — treat it as the thing everything else is built from, not a place to add one-off domain components.

Some admin pages are one large file per domain (`StudentsView.tsx`, `StaffManagementView.tsx`, `AcademicYearView.tsx`, `TimetableView.tsx`) containing the list view, its drawers/dialogs, and helper subcomponents all together, rather than split into many small files — this is the established pattern here, not an accident; follow it rather than splitting a file into pieces mid-edit unless asked.

### State: RTK Query, not client state, for anything server-backed

`store/api/*.ts` — one file per backend module (`studentsApi.ts`, `usersApi.ts`, `termsApi.ts`, `gradingSchemesApi.ts`, `timetableApi.ts`, `billingApi.ts`, `feesOnlineApi.ts`, etc.), each a `createApi`-style slice injected into `baseApi.ts`. `baseApi.ts` also owns the auto-refresh-on-401 logic: concurrent 401s share a single in-flight `/auth/refresh` call (the backend rotates + single-uses refresh tokens, so naively firing one refresh per failed request would log a perfectly valid session out). Mutations invalidate RTK Query cache tags to keep lists in sync — when adding a new mutation, check the sibling mutations in the same api file for which tags to invalidate rather than guessing.

`store/slices/` is plain Redux for genuinely client-only state (auth tokens, etc.) — small, and should stay that way; anything that comes from the backend belongs in an RTK Query api file instead.

### Institution-configurable terminology

`lib/terminology.ts`'s `useTerminology()` hook (and `getTerminologyForTermType()` for a specific term's own override) resolves labels like "Class" vs "Course", "Section" vs "Batch", "Academic Year" vs "Semester" based on the institution's `academicStructure` setting. Any UI text naming these concepts should go through this hook rather than hardcoding "Class"/"Section"/etc. — a school's actual configured wording can differ per term, not just per institution (see `AcademicYearView.tsx`'s comments on why the page title says "Academic Terms" rather than `terminology.termPlural`).

### Design-system conventions worth knowing before touching UI

These are established, not incidental — recent work in this repo (Students/Staff, ID Cards, Academic Terms & Grading, Timetable) converged on the same conventions across every admin list page after they'd drifted apart:

- **Always use `components/ui/select.tsx`'s `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue`** for any dropdown — never a bare native `<select>`. Radix `Select.Item` cannot have an empty-string `value`; when a dropdown needs a "none"/"no selection" option, use a sentinel string (e.g. `'none'`) translated to/from `''` at the state boundary (see `AcademicYearView.tsx`'s "no parent academic year" or `TimetableView.tsx`'s "no subject" for the pattern).
- **Primary page actions (Add/Create/Import/Promote-style buttons) belong in `PageHeader`'s `actions` prop**, not floating in a row inside the page body. If a page has tabs with different primary actions per tab, control the `Tabs` value in the parent component (`useState`, not the `key`-remount trick) so `PageHeader` can render the right buttons for whichever tab is active.
- **A filter/picker toolbar (e.g. "pick a class and section") is visually lighter than content** — `rounded-xl border border-border/70 bg-muted/20 p-4`, not a full `Card`. A `Card` (`overflow-hidden rounded-2xl border border-border bg-card shadow-sm`) is for the actual list/table/roster content, with its own `border-b border-border p-4` toolbar strip on top when it has inline search+filters (see `StudentsView.tsx`/`StaffManagementView.tsx`).
- **Help/explanatory content (`InfoNote`) goes at the bottom of the page, after the actual tool**, not above it — admins interact with the tool first and reach for an explanation only if something's unclear. Each `InfoNote` should answer one specific question (what is X, what happens when I do Y, how fast does it take effect) rather than one long note covering everything.
- **Empty states use `components/ui/empty-state.tsx`** with an icon, title, description, and — when there's an obvious next action — an `action` button; every list page should have one for its zero-items case, not a blank area.
- **Destructive/edit row actions** (edit pencil, delete trash) are icon-only buttons that appear on hover (`group`/`group-hover:flex`) inside a table row or card, `stopPropagation`'d if the row itself has its own click handler (e.g. opening a detail drawer).

### Print support

Any page with a "Print" button follows the same mechanics (see `components/shared/idCardPrint.ts` and `TimetableView.tsx`'s own `TIMETABLE_PRINT_CSS`): a `@media print` stylesheet injected via `<style dangerouslySetInnerHTML>`, `body * { visibility: hidden }` then re-revealing only a specific `id`'d container, and a `.no-print` utility class for anything that should never appear in print output. When more than one such printable container can exist in the DOM at once (e.g. a bulk "print all" dialog open over a still-mounted single-item preview), only one may have its print-trigger `id` attribute set at a time — drop the `id` (don't just hide the element) on whichever one isn't the active target, or both get revealed and rendered on top of each other. Bulk multi-page print grids use `display: flex; flex-wrap: wrap` for the print layout, not `display: grid` — CSS grid's row/track layout is unreliable across multiple printed pages in several browsers, whereas wrapped flex content paginates the same way ordinary block content always has.

PDF **downloads** (as opposed to browser print) go through `components/shared/cardDownload.ts` (`jspdf` + `html2canvas-pro`), rasterizing the same on-screen DOM nodes the print flow uses rather than maintaining a separate PDF-layout implementation.

### Self-service vs admin views

`MyIdCardView.tsx` (and the `my-id-card` route) is the one page every staff-type role and student share — it renders only the signed-in user's own record, resolved server-side from the auth token, not from any client-supplied id. Any "can a user see someone else's data here" question about a self-service page is usually already answered by this scoping rather than needing a new permission check in the frontend.
