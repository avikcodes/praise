import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  FileText,
  Filter,
  MessageSquareQuote,
  Plug,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "AI Integrations & Model Context Protocol (MCP)",
  description:
    "Explore Praise's planned Model Context Protocol (MCP) server, assistant queries, and future ChatGPT and Claude connections for semantic customer proof search.",
  path: "/ai-integrations",
});

const exampleUseCases = [
  {
    icon: Search,
    title: "1. Search Customer Testimonials",
    prompt:
      "Find all testimonials from enterprise customers who mentioned migrating from a legacy vendor.",
    explanation:
      "The MCP server performs a semantic search across approved entries, matching customer context rather than relying solely on literal keywords.",
    result:
      "Returns quotes with submitter name, company, star rating, and direct links to the verified source recording.",
  },
  {
    icon: Filter,
    title: "2. Find Quotes by Topic",
    prompt:
      "What did users say about our Docker self-hosting performance and backup simplicity?",
    explanation:
      "Filters across tagged categories and video transcript text to pinpoint exact sentences discussing deployment reliability.",
    result:
      "Extracts three concise quotes discussing ease of deployment, memory footprint, and PostgreSQL stability.",
  },
  {
    icon: BrainCircuit,
    title: "3. Analyze Customer Feedback Trends",
    prompt:
      "Analyze the common praise patterns and feature requests across Q3 audio and video submissions.",
    explanation:
      "The assistant synthesizes transcripts into actionable product insights: top appreciated features and frequently requested enhancements.",
    result:
      "Generates an executive summary of customer sentiment trends with cited quote evidence.",
  },
  {
    icon: FileText,
    title: "4. Draft In-Depth Case Studies",
    prompt:
      "Draft a 400-word mini case study highlighting Alex Reed's review, focusing on ROI and security compliance.",
    explanation:
      "Using the full questionnaire responses and transcript, the assistant structures a classic Challenge &rarr; Solution &rarr; Result case study.",
    result:
      "A ready-to-publish customer success story formatted with quotes, metrics, and customer attribution.",
  },
  {
    icon: MessageSquareQuote,
    title: "5. Suggest Testimonials for Landing Pages",
    prompt:
      "I am designing our pricing section. Suggest two short, high-impact quotes that resolve price sensitivity.",
    explanation:
      "Matches quotes directly to target landing page conversion goals, filtering for short (1-2 sentence) punchy statements.",
    result:
      "Offers two verified customer quotes specifically highlighting cost savings and rapid ROI.",
  },
];

export default function AiIntegrationsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Intelligence Roadmap</span>
            <StatusBadge status="planned" label="Planned Roadmap" />
          </div>
          <h1 className="display mt-4 max-w-3xl">
            Connecting customer proof to modern AI assistants & MCP
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Imagine asking Claude, Cursor, or ChatGPT to find the exact customer
            quote you need for a sales proposal or landing page. Learn how Praise
            is designing local Model Context Protocol connectivity.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started with Praise
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/developers" variant="secondary" size="lg">
              View developer specs
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Roadmap Transparency Banner */}
      <Section tone="white" className="py-8">
        <div className="surface border-brand-200 bg-brand-50/50 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="icon-tile shrink-0 bg-white">
              <Plug size={20} className="text-brand-600" />
            </span>
            <div>
              <h3 className="heading-md text-brand-900">
                Transparent Roadmap Notice
              </h3>
              <p className="muted mt-1 text-sm text-ink-700">
                The Model Context Protocol (MCP) server and assistant integrations
                described on this page are <strong>under active design and planning</strong>.
                They are not yet connected out of the box in the current core
                release. We outline them here so you can understand our architectural
                direction.
              </p>
            </div>
          </div>
          <Link
            href="https://github.com"
            className="btn btn-secondary btn-sm shrink-0 whitespace-nowrap bg-white"
          >
            Track on GitHub &rarr;
          </Link>
        </div>
      </Section>

      {/* What is the Praise MCP Server */}
      <Section tone="muted">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">Protocol</span>
              <StatusBadge status="planned" label="MCP Architecture" />
            </div>
            <h2 className="heading-lg">
              The Model Context Protocol (MCP) Standard
            </h2>
            <p className="lead">
              The Model Context Protocol is an open standard that allows AI
              models to query local data sources securely. Instead of exporting
              CSVs and pasting them into AI chat windows, Praise will expose a
              lightweight, authenticated MCP server.
            </p>

            <div className="flex flex-col gap-3 text-sm text-ink-700">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Strict Read-Only Access:</strong> The MCP server will
                  only expose testimonials that have been explicitly marked as
                  &apos;Approved&apos; by a human moderator. Private customer emails
                  and unreviewed drafts are never exposed.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Local Network Privacy:</strong> Run the MCP server
                  directly on your own infrastructure or workstation. Your customer
                  database never touches third-party vector databases.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Tool Excursions & Semantic Filters:</strong> Exposes
                  tools like <code>search_testimonials</code>,{" "}
                  <code>get_quotes_by_topic</code>, and{" "}
                  <code>get_featured_proof</code>.
                </span>
              </div>
            </div>
          </div>

          <div className="surface overflow-hidden shadow-sm">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                MCP Tool Definition (Planned Specification)
              </span>
              <span className="chip text-[11px]">JSON Schema</span>
            </div>
            <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto bg-[#1b1a18] text-[#f6f4ef] rounded-b-2xl">
              &#123;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;name&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;search_testimonials&quot;</span>,
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;description&quot;</span>:{" "}
              <span className="text-emerald-300">
                &quot;Query approved customer testimonials by topic or keyword&quot;
              </span>,
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;parameters&quot;</span>: &#123;
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-300">&quot;topic&quot;</span>: &#123;{" "}
              <span className="text-amber-300">&quot;type&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;string&quot;</span> &#125;,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-300">&quot;min_rating&quot;</span>: &#123;{" "}
              <span className="text-amber-300">&quot;type&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;integer&quot;</span> &#125;,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-300">&quot;format&quot;</span>: &#123;{" "}
              <span className="text-amber-300">&quot;enum&quot;</span>: [
              <span className="text-emerald-300">&quot;text&quot;</span>,{" "}
              <span className="text-emerald-300">&quot;video&quot;</span>,{" "}
              <span className="text-emerald-300">&quot;audio&quot;</span>] &#125;
              <br />
              &nbsp;&nbsp;&#125;
              <br />
              &#125;
            </div>
          </div>
        </div>
      </Section>

      {/* 5 Concrete Interaction Examples */}
      <Section tone="white">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Practical Examples"
            title="What you will be able to ask your AI assistant"
            description="Concrete workflows enabled once Praise's MCP server and assistant connectors are in place."
          />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exampleUseCases.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <span className="icon-tile">
                      <Icon size={18} />
                    </span>
                    <h3 className="heading-md">{item.title}</h3>

                    {/* Prompt Box */}
                    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 block mb-1">
                        Prompt to Assistant
                      </span>
                      <p className="font-mono text-ink-800 italic">
                        &quot;{item.prompt}&quot;
                      </p>
                    </div>

                    <p className="muted text-xs leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>

                  <div className="border-t border-line/60 pt-3 text-xs text-ink-700">
                    <span className="font-semibold text-ink-900 block mb-0.5">
                      Assistant Output:
                    </span>
                    <span className="text-ink-600">{item.result}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Planned ChatGPT App Integration Explanation */}
      <Section tone="muted">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">OpenAI</span>
              <StatusBadge status="planned" label="Planned Concept" />
            </div>
            <h2 className="heading-lg">
              Planned ChatGPT App &amp; Custom GPT Action
            </h2>
            <p className="lead">
              For teams using ChatGPT Team or Enterprise, Praise plans to offer
              an authenticated custom GPT action.
            </p>
            <div className="flex flex-col gap-3 text-sm text-ink-700">
              <p>
                <strong>How it is planned to work:</strong> Administrators create
                a scoped API key inside Praise with read-only permissions for
                approved testimonials. You add your Praise instance URL and
                OpenAPI schema to your private ChatGPT workspace.
              </p>
              <p>
                Team members can then converse with ChatGPT, querying their
                company&apos;s customer testimonials in real time while drafting
                outreach emails, sales battle cards, or pitch decks.
              </p>
              <div className="surface p-4 text-xs text-ink-500">
                <strong>Important note:</strong> Praise does not claim this
                integration currently exists. It is part of our future
                Intelligence release milestone.
              </div>
            </div>
          </div>

          <div className="card flex flex-col gap-4 border-dashed border-brand-300 bg-warm-50/60 p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-sm text-ink-900">
                <Bot size={18} className="text-brand-600" />
                ChatGPT Workspace Integration
              </span>
              <span className="chip border-dashed border-brand-300 text-[11px] text-brand-700">
                Planned Specification
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs text-ink-700 bg-white p-4 rounded-xl border border-line">
              <div className="text-ink-400">{"// Authentication pattern"}</div>
              <div>Authorization: Bearer praise_api_live_***</div>
              <div className="text-ink-400">{"// Scoped endpoints"}</div>
              <div>GET /api/v1/gpt/search?q=reliability</div>
              <div>GET /api/v1/gpt/quotes?limit=3</div>
            </div>

            <p className="text-xs text-ink-500 leading-relaxed">
              Maintains full organizational boundaries: queries never touch other
              tenants, and access requires your self-hosted bearer authentication.
            </p>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">The future of social proof</span>
          <h2 className="heading-lg max-w-2xl">
            Start gathering customer praise today
          </h2>
          <p className="lead max-w-xl">
            Deploy Praise on your server today to collect and organize genuine
            video and written proof. When the MCP server launches, your library
            will be ready.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started with Praise
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/developers" variant="secondary" size="lg">
              Read developer architecture
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
