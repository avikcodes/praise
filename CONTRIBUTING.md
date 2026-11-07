# Contributing to Praise

Thank you for your interest in contributing to Praise! Praise is a free, open-source, self-hosted testimonial platform built for the community. We welcome contributions from developers, designers, technical writers, and users of all experience levels.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to ensure a welcoming and inclusive environment for everyone.

---

## Ways to Contribute

There are many ways to contribute to Praise beyond writing code:

1. **Reporting Bugs:** Help us find edge cases and issues in collection forms, moderation, or widget rendering.
2. **Proposing Features:** Share real-world use cases and workflows that would improve customer proof management.
3. **Writing Documentation:** Improve guides, write deployment tutorials for various cloud providers, or fix typos.
4. **Code & SDKs:** Fix bugs, optimize widget rendering performance, or build framework integrations.
5. **Widget Themes & Layouts:** Propose new responsive layouts and CSS customizations for testimonial cards.

---

## Finding Good First Issues

If you are new to the project:

- Look for issues labeled `good first issue` on GitHub for self-contained tasks.
- Look for issues labeled `documentation` to help refine guides and API specs.
- Check the [Roadmap](https://praise.yourdomain.com/community/roadmap) to see what is currently in progress.

---

## Reporting Bugs

Before reporting a bug, search existing issues to see if it has already been filed.

When opening a new bug report, include:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected behavior vs. actual behavior.
- Browser and OS version (especially for video/audio webcam recording issues).
- Relevant console logs or terminal output.

---

## Proposing Features

We encourage feature proposals! Before submitting a pull request for a large feature:
1. Open a **Feature Request** on GitHub Discussions.
2. Describe the problem you are solving and why existing features do not cover it.
3. Share your proposed design or API interface to gather feedback from maintainers.

---

## Setting Up Local Development

### Prerequisites
- Node.js 20.x LTS or 22.x LTS
- `npm` (bundled with Node.js) or `pnpm`
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ossproject/praise.git
cd praise
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```
For local development, `NEXT_PUBLIC_SITE_URL=http://localhost:3000` is already configured.

### 4. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Branch and Pull Request Workflow

1. **Fork and Branch:** Create a feature branch off `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
2. **Make Focused Changes:** Keep PRs focused on a single responsibility.
3. **Validate Code Quality:**
   Run linting, type checks, and production builds before committing:
   ```bash
   # Run ESLint
   npm run lint

   # Run TypeScript type check
   npx tsc --noEmit

   # Verify static production build
   npm run build
   ```
4. **Commit Guidelines:** Use clear, imperative commit messages (e.g., `feat: add masonry layout option to widgets`, `fix: handle null avatar URLs in quote cards`).
5. **Open a Pull Request:** Describe what changed, why, and reference any related issue numbers (e.g., `Closes #42`).

---

## Review Process

- Maintainers review PRs for code style, security, accessibility, and documentation integrity.
- You may receive suggestions or requested changes; please reply or push updates to your PR branch.
- Once approved, maintainers will squash and merge your contribution into `main`.

Thank you for helping build Praise!

