# FR/EN i18n, Sidebar pagination/infinite scroll, a11y improvements, and icon registry (lucide)

Summary
- Add client-side i18n (react-intl) with FR/EN, provider injected at app root, messages under packages/common/i18n, and a language selector in Settings.
- Implement paginated thread listing with infinite scroll in the sidebar (Dexie-based, windowed + grouped by date). Pinned section preserved.
- Improve accessibility: add skip-to-content, proper aria-labels for icon-only buttons, role="main", status roles, and localized dialog titles.
- Rationalize icons via a common registry using lucide-react; replace scattered direct imports; remove @tabler/icons-react/react-icons from app; update UI dialog close icon.

Details
- i18n
  - packages/common/i18n/{en,fr}.json with domain keys (chat.input.placeholder, sidebar.groups.*, actions.*, etc.).
  - packages/common/i18n/index.ts exposes I18nProvider + useI18n() with formatMessage/t and locale persistence (localStorage app.locale) and detection (navigator.language). Sets document.lang.
  - apps/web/app/layout.tsx wraps app with I18nProvider (no URL routing change, client-only).
  - Replace critical strings in: sidebar, chat input placeholder and greetings, command search (actions, groups), settings modal titles/menu, feedback widget, messages remaining banner, intro dialog aria title, history item menu.

- Pagination / Infinite scroll
  - packages/common/store/chat.store.ts: add listThreads({offset,limit}) + countThreads(), using Dexie orderBy('createdAt') and filtering out pinned. Returns descending windows; pinned handled separately.
  - packages/common/components/side-bar.tsx: initial window of 30 non-pinned threads; IntersectionObserver sentinel to load more as user scrolls; loader state and hasMore handled. Grouping computed post-pagination. Pinned group unchanged.

- Accessibility (a11y)
  - Skip link added in RootLayout and role="main" on main container.
  - Icon-only buttons get aria-labels; icons set aria-hidden by default in registry wrappers.
  - Dialog title conveyed via ariaTitle prop; added localized title for IntroDialog.
  - Code-block copy has aria-label; async editor loader announces via role="status".
  - Mobile overlay text localized; kept overlay intact (still blocks under md).

- Icons/design system
  - New central registry packages/common/components/icons.tsx exporting Tabler-compatible names mapped to lucide-react icons for consistency and bundle reduction.
  - Replaced imports in major components to use the registry; updated @repo/ui dialog to use lucide X.
  - Removed @tabler/icons-react, @phosphor-icons/react and react-icons from apps/web/package.json where no longer needed.

Migration notes
- Import icons from the registry: `import { IconPlus, IconSearch } from '@repo/common/components'` (icons are re-exported there). Do not import from individual icon libraries.
- Use `useI18n()` for strings: `const { t } = useI18n();` then `t('actions.new')` etc. Add new keys under packages/common/i18n/{en,fr}.json.

Acceptance
- Language selector toggles FR/EN instantly and persists.
- Sidebar loads first batch fast and infinite scroll continues smoothly; pinned and active state preserved; date groups update correctly.
- Keyboard and screen reader navigation improved (modals, sidebar, chat input). Decorative icons are ignored by SR; icon buttons are labeled.
- One icon library exposed through the registry; removed direct icon imports in touched files; app deps cleaned.
- Mobile overlay still present and unchanged for sub-md.

Tests
- Manual smoke tested: language switcher, sidebar loading, command search titles, copy buttons, feedback submit, skip link focus.

Follow-ups (optional)
- Continue phasing out remaining direct icon imports in secondary components (animated-input, chat-actions) for full consolidation.
- Extend i18n coverage across all secondary pages (recent, footer, sign-in copy).
