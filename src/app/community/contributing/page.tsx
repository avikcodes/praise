import Link from "next/link";
import {
  BookOpen,
  Bug,
  CheckCircle2,
  Code2,
  GitBranch,
  GitFork,
  GitPullRequest,
  Lightbulb,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { CodeBlock } from "@/components/docs/code-block";
import {
  ISSUES_URL,
  REPOSITORY_URL,
  pageMetadata,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contributing Guide — How to Contribute to Praise",
  description:
    "Official contributor guide for Praise: good first issues, bug reporting, feature proposals, local dev setup, PR workflows, code quality, testing, and code of conduct.",
  path: "/community/contributing",
});

const contributionWays = [
  {
    icon: Bug,
    title: "1. Report Bugs & Edge Cases",
    description:
      "Test collection forms on unusual mobile browsers or test Docker deployment across different Linux distributions.",
  },
  {
    icon: Lightbulb,
    title: "2. Propose Features & RFCs",
    description:
      "Share real-world feedback from your team to shape upcoming Praise Complete and Intelligence releases.",
  },
  {
    icon: Code2,
    title: "3. Write Code & Framework SDKs",
    description:
      "Fix issues, optimize widget rendering performance, or help build React and Next.js component wrappers.",
  },
  {
    icon: BookOpen,
    title: "4. Improve Documentation",
    description:
      "Clarify self-hosting steps, write reverse proxy tutorials, or fix typos and broken links.",
  },
];

export default function ContributingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow mb-3">Contributor Guide</span>
          <h1 className="display max-w-3xl">
            Help build the open social proof platform
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Whether you are fixing a typo in documentation, reporting a browser
            glitch, or designing a new widget layout, your contributions are
            warmly welcomed.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {REPOSITORY_URL ? (
              <ButtonLink
                href={REPOSITORY_URL}
                variant="primary"
                size="lg"
              >
                <GitFork size={16} />
                Fork on GitHub
              </ButtonLink>
            ) : null}
            <ButtonLink href="/community/discussions" variant="secondary" size="lg">
              Join Discussions
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* 1. Welcome to Contributors & Ways to Contribute */}
      <Section tone="white" className="py-12">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Overview"
            title="Ways to Contribute"
            description="Contributing to Praise is not limited to writing TypeScript code. We celebrate all forms of participation."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contributionWays.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card flex flex-col gap-3 p-5">
                  <span className="icon-tile">
                    <Icon size={18} />
                  </span>
                  <h3 className="heading-md text-base">{item.title}</h3>
                  <p className="muted text-xs leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 2. Finding Good First Issues */}
      <Section tone="muted">
        <div className="surface p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="tag">Beginners Welcome</span>
              <span className="text-xs font-semibold text-brand-700">Good First Issues</span>
            </div>
            <h3 className="heading-md">New to the Praise codebase?</h3>
            <p className="muted text-xs leading-relaxed">
              We curate self-contained issues labeled <code>good first issue</code>{" "}
              on GitHub. These are ideal starting points for understanding our
              component hierarchy, Tailwind tokens, and Next.js App Router layout.
            </p>
          </div>

          {ISSUES_URL ? (
            <ButtonLink
              href={ISSUES_URL}
              variant="secondary"
              size="md"
              className="shrink-0"
            >
              Browse Good First Issues &rarr;
            </ButtonLink>
          ) : (
            <span className="chip text-xs text-ink-500">
              Issues will appear when NEXT_PUBLIC_GITHUB_REPO_URL is set
            </span>
          )}
        </div>
      </Section>

      {/* 3. Reporting Bugs & Proposing Features */}
      <Section id="reporting-bugs" tone="white">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="tag">Bug Reports</span>
              <Bug size={14} className="text-ink-500" />
            </div>
            <h2 className="heading-lg">Reporting Bugs</h2>
            <p className="lead text-sm">
              Clear bug reports help us diagnose and fix issues rapidly. Before
              opening an issue, please search existing issues to see if it has
              already been reported.
            </p>
            <div className="surface p-4 text-xs space-y-2 text-ink-700">
              <h4 className="font-semibold text-ink-900">What to include:</h4>
              <ul className="list-disc pl-4 space-y-1 text-ink-600">
                <li>A concise description of the bug.</li>
                <li>Clear step-by-step reproduction instructions.</li>
                <li>Expected vs. actual behavior.</li>
                <li>Browser, OS, and Docker engine version (if applicable).</li>
                <li>Relevant console or terminal error logs.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="tag">Proposals</span>
              <Lightbulb size={14} className="text-ink-500" />
            </div>
            <h2 className="heading-lg">Proposing Features</h2>
            <p className="lead text-sm">
              We welcome ideas that make customer proof easier to collect and
              publish! For major additions, please open an RFC discussion first.
            </p>
            <div className="surface p-4 text-xs space-y-2 text-ink-700">
              <h4 className="font-semibold text-ink-900">Proposal structure:</h4>
              <ul className="list-disc pl-4 space-y-1 text-ink-600">
                <li><strong>The Problem:</strong> What limitation are you facing?</li>
                <li><strong>The Proposed Solution:</strong> How should Praise handle this?</li>
                <li><strong>Alternatives Considered:</strong> Did you consider other approaches?</li>
                <li><strong>API / UI Impacts:</strong> How does this affect existing forms or widgets?</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* 4. Local Development Setup */}
      <Section tone="muted">
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
          <SectionHeading
            eyebrow="Setup"
            title="Setting Up Local Development"
            description="Derive your development environment from the actual repository scripts."
          />

          <div className="space-y-6">
            <div>
              <h3 className="heading-md text-base mb-2">1. Clone and Install Dependencies</h3>
              <CodeBlock
                language="bash"
                filename="Terminal"
                code={`# Clone your fork
git clone https://github.com/YOUR_USERNAME/praise.git
cd praise

# Install dependencies with npm
npm install`}
              />
            </div>

            <div>
              <h3 className="heading-md text-base mb-2">2. Environment Configuration</h3>
              <CodeBlock
                language="bash"
                filename="Terminal"
                code={`# Copy development environment variables
cp .env.example .env`}
              />
            </div>

            <div>
              <h3 className="heading-md text-base mb-2">3. Start the Development Server</h3>
              <CodeBlock
                language="bash"
                filename="Terminal"
                code={`# Start Next.js with hot reloading
npm run dev`}
              />
              <p className="muted text-xs mt-1">
                Open <code>http://localhost:3000</code> in your browser to inspect live changes.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 5. Branch & PR Workflow + Quality Checks */}
      <Section tone="white">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="tag">Workflow</span>
              <GitBranch size={14} className="text-ink-500" />
            </div>
            <h2 className="heading-lg">Pull Request Workflow</h2>
            <p className="lead text-sm">
              We follow a standard GitHub flow. Keep branches focused on a single
              fix or feature:
            </p>

            <CodeBlock
              language="bash"
              filename="Git Workflow"
              code={`# 1. Create a dedicated branch
git checkout -b feat/add-masonry-widget

# 2. Make your focused edits and commit
git commit -m "feat(widgets): add masonry layout variant"

# 3. Push to your fork and submit a PR
git push origin feat/add-masonry-widget`}
            />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="tag">Testing</span>
              <CheckCircle2 size={14} className="text-brand-600" />
            </div>
            <h2 className="heading-lg">Code Quality &amp; Verification</h2>
            <p className="lead text-sm">
              Before submitting a pull request, verify that linting, type checks,
              and production builds succeed cleanly:
            </p>

            <CodeBlock
              language="bash"
              filename="Quality Verification"
              code={`# Run ESLint validation
npm run lint

# Run TypeScript compiler checks
npx tsc --noEmit

# Test production build
npm run build`}
            />
          </div>
        </div>
      </Section>

      {/* 6. Documentation Contributions & Review Process */}
      <Section tone="muted">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="surface p-6 flex flex-col gap-3">
            <h3 className="heading-md">Documentation Contributions</h3>
            <p className="muted text-xs leading-relaxed">
              Clear documentation is as important as working code. Our docs live
              in <code>src/app/docs/</code> and the markdown guide files. When adding
              new features or endpoints, update the corresponding documentation
              and examples in the same pull request.
            </p>
          </div>

          <div className="surface p-6 flex flex-col gap-3">
            <h3 className="heading-md">Code of Conduct &amp; Review</h3>
            <p className="muted text-xs leading-relaxed">
              All contributions are governed by our{" "}
              <Link href="https://github.com" className="link font-semibold">
                Code of Conduct
              </Link>
              . Project maintainers review PRs for security, accessibility, and
              simplicity. You will receive constructive feedback to help get your
              PR merged!
            </p>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Ready to contribute?</span>
          <h2 className="heading-lg max-w-2xl">
            Join the community of Praise contributors
          </h2>
          <p className="lead max-w-xl">
            Fork our repository, clone the code, and submit your first pull
            request today.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {REPOSITORY_URL ? (
              <ButtonLink
                href={REPOSITORY_URL}
                variant="primary"
                size="lg"
              >
                <GitPullRequest size={17} />
                Open Pull Requests
              </ButtonLink>
            ) : null}
            <ButtonLink href="/community/discussions" variant="secondary" size="lg">
              Visit Discussions
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
