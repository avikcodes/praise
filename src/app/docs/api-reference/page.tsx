import {
  AlertCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { TableOfContents, type TocItem } from "@/components/docs/toc";
import { DocsPager } from "@/components/docs/pager";
import { CodeBlock } from "@/components/docs/code-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "REST API Reference & Webhook Specifications",
  description:
    "Complete technical reference for the Praise REST API: bearer authentication, projects, forms, testimonials, tag taxonomy, pagination, error schemas, and webhook events.",
  path: "/docs/api-reference",
});

const tocItems: TocItem[] = [
  { id: "api-overview", title: "API Overview & Architecture" },
  { id: "specification-status", title: "Implementation Status" },
  { id: "authentication", title: "Authentication & API Keys" },
  { id: "workspaces-projects", title: "Workspaces & Projects" },
  { id: "forms-endpoints", title: "Collection Forms Endpoints" },
  { id: "testimonials-endpoints", title: "Testimonials Endpoints" },
  { id: "tags-taxonomy", title: "Tags & Categorization" },
  { id: "widgets-endpoints", title: "Widgets Configuration" },
  { id: "pagination-filtering", title: "Pagination & Filtering" },
  { id: "webhooks", title: "Event Webhooks Specification" },
  { id: "error-handling", title: "Error Handling & Status Codes" },
  { id: "security-permissions", title: "Security & Permissions" },
];

export default function ApiReferenceDocsPage() {
  return (
    <div className="flex flex-col xl:flex-row xl:gap-10">
      <article className="flex-1 min-w-0">
        <Breadcrumbs
          crumbs={[
            { label: "Overview", href: "/docs" },
            { label: "API Reference" },
          ]}
        />

        <div className="mb-8 border-b border-line pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="eyebrow">Developer Reference</span>
            <StatusBadge status="planned" label="Planned Specification" />
          </div>
          <h1 className="display text-3xl sm:text-4xl">REST API Reference</h1>
          <p className="lead mt-3 text-base text-ink-600">
            Comprehensive specifications for programmatically querying
            testimonials, submitting customer feedback, managing tag taxonomies,
            and receiving real-time webhook events.
          </p>
        </div>

        {/* 1. API Overview */}
        <section id="api-overview" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">1. API Overview &amp; Architecture</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            The Praise REST API is designed to follow strict REST principles over
            HTTPS. Requests accept and return standard <code>application/json</code>{" "}
            payloads (with <code>multipart/form-data</code> supported for video
            and audio media uploads).
          </p>
          <div className="surface p-4 font-mono text-xs text-ink-800 space-y-1">
            <div>
              <span className="text-ink-400">Base URL: </span>
              <code>https://praise.yourdomain.com/api/v1</code>
            </div>
            <div>
              <span className="text-ink-400">Data Format: </span>
              <code>JSON (UTF-8)</code>
            </div>
            <div>
              <span className="text-ink-400">Protocol: </span>
              <code>HTTPS (TLS 1.2 / 1.3 required)</code>
            </div>
          </div>
        </section>

        {/* 2. Implementation Status */}
        <section id="specification-status" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">2. Implementation Status</h2>
          <div className="surface border-amber-200 bg-amber-50/50 p-4 mb-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>Planned Specification Notice:</strong> The endpoints and
              webhook schemas detailed on this page represent Praise&apos;s
              target API architecture for the Complete Release milestone. They
              are documented here to allow developers to design integrations in
              advance. Check the Praise GitHub repository for merge status.
            </div>
          </div>
        </section>

        {/* 3. Authentication & API Keys */}
        <section id="authentication" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">3. Authentication &amp; API Keys</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            All API requests must include a Bearer token in the{" "}
            <code>Authorization</code> HTTP header:
          </p>

          <CodeBlock
            language="http"
            filename="HTTP Header"
            code={`Authorization: Bearer praise_live_sk_89f1a23e74b901a`}
          />

          <h3 className="heading-md text-base mt-6 mb-2">Key Types</h3>
          <div className="surface overflow-hidden divide-y divide-line text-xs">
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-32 shrink-0">
                Publishable Key
              </span>
              <span className="text-ink-600">
                Prefix <code>praise_pk_</code> &bull; Safe to expose in frontend
                browsers. Grants read-only access to approved public testimonials.
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-32 shrink-0">
                Secret Live Key
              </span>
              <span className="text-ink-600">
                Prefix <code>praise_live_sk_</code> &bull; Keep on your secure backend.
                Grants read/write access to moderate, create, and purge records.
              </span>
            </div>
          </div>
        </section>

        {/* 4. Workspaces & Projects */}
        <section id="workspaces-projects" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">4. Workspaces &amp; Projects</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Projects segment your testimonial data. All testimonials belong to a
            specific project ID.
          </p>

          <CodeBlock
            language="bash"
            filename="cURL Request"
            code={`curl -X GET https://praise.yourdomain.com/api/v1/projects \\
  -H "Authorization: Bearer praise_live_sk_..."`}
          />

          <p className="muted text-xs leading-relaxed mt-2 mb-2">
            Example Response:
          </p>

          <CodeBlock
            language="json"
            filename="Response 200 OK"
            code={`{
  "data": [
    {
      "id": "proj_a901ff23",
      "name": "Cloud Core Product",
      "slug": "cloud-core",
      "created_at": "2026-03-01T12:00:00Z"
    }
  ]
}`}
          />
        </section>

        {/* 5. Forms Endpoints */}
        <section id="forms-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">5. Collection Forms Endpoints</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Query form configurations or submit feedback from custom mobile or
            web applications:
          </p>

          <div className="surface p-4 text-xs font-mono mb-4">
            <span className="font-bold text-emerald-700">GET </span>
            <code>/api/v1/forms/:form_id</code>
          </div>

          <CodeBlock
            language="json"
            filename="Response"
            code={`{
  "id": "form_87c2b4a1",
  "project_id": "proj_a901ff23",
  "title": "Share your thoughts on Cloud Core",
  "allow_video": true,
  "allow_audio": true,
  "allow_text": true,
  "require_rating": true,
  "questions": [
    "What specific problem did Cloud Core solve for you?",
    "How likely are you to recommend us to a colleague?"
  ]
}`}
          />
        </section>

        {/* 6. Testimonials Endpoints */}
        <section id="testimonials-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">6. Testimonials Endpoints</h2>

          <h3 className="heading-md text-base mt-4 mb-2">List Approved Testimonials</h3>
          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-emerald-700">GET </span>
            <code>/api/v1/testimonials?project_id=proj_a901ff23&amp;status=approved</code>
          </div>

          <CodeBlock
            language="json"
            filename="Response 200 OK"
            code={`{
  "data": [
    {
      "id": "tst_1289fe40",
      "format": "video",
      "status": "approved",
      "rating": 5,
      "customer": {
        "name": "Sarah Jenkins",
        "title": "Head of Product",
        "company": "ScaleFlow",
        "avatar_url": "https://praise.yourdomain.com/media/avatars/sarah.jpg"
      },
      "media": {
        "video_url": "https://praise.yourdomain.com/media/videos/tst_1289fe40.mp4",
        "duration_seconds": 42
      },
      "text": "Praise gave us full ownership over our video assets without ongoing per-video fees.",
      "tags": ["enterprise", "speed"],
      "created_at": "2026-03-15T09:30:00Z"
    }
  ],
  "meta": {
    "total": 48,
    "page": 1,
    "limit": 20
  }
}`}
          />

          <h3 className="heading-md text-base mt-6 mb-2">Create New Submission</h3>
          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-brand-700">POST </span>
            <code>/api/v1/testimonials</code>
          </div>
          <p className="muted text-xs leading-relaxed mb-2">
            Accepts <code>multipart/form-data</code>. New submissions always land
            in <code>pending</code> status awaiting manual moderation.
          </p>
        </section>

        {/* 7. Tags Taxonomy */}
        <section id="tags-taxonomy" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">7. Tags &amp; Categorization</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Tags allow you to organize testimonials across marketing campaigns
            and feature blocks:
          </p>
          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-emerald-700">GET </span>
            <code>/api/v1/tags</code>
          </div>
          <p className="muted text-xs">
            Query tags attached to a project to feed dynamic filter dropdowns on
            custom marketing pages.
          </p>
        </section>

        {/* 8. Widgets Configuration */}
        <section id="widgets-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">8. Widgets Configuration Endpoint</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The embed runtime fetches its layout configuration and theme colors
            via:
          </p>
          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-emerald-700">GET </span>
            <code>/api/v1/widgets/:widget_id</code>
          </div>
          <p className="muted text-xs leading-relaxed">
            Returns layout mode (<code>grid</code>, <code>carousel</code>,{" "}
            <code>quote</code>, <code>wall</code>), color tokens, and matching
            approved testimonials.
          </p>
        </section>

        {/* 9. Pagination & Filtering */}
        <section id="pagination-filtering" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">9. Pagination &amp; Filtering</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            All listing endpoints support standard query parameters:
          </p>
          <div className="surface overflow-hidden divide-y divide-line text-xs">
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">page</code>
              <span className="text-ink-600">Integer (default: 1)</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">limit</code>
              <span className="text-ink-600">Integer between 1 and 100 (default: 20)</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">format</code>
              <span className="text-ink-600">Filter by &apos;text&apos;, &apos;video&apos;, or &apos;audio&apos;</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">tag</code>
              <span className="text-ink-600">Filter by tag string (e.g. &apos;pricing&apos;)</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">min_rating</code>
              <span className="text-ink-600">Integer from 1 to 5</span>
            </div>
          </div>
        </section>

        {/* 10. Webhooks */}
        <section id="webhooks" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">10. Event Webhooks Specification</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise dispatches HTTP POST requests to configured webhook URLs when
            events happen in your workspace:
          </p>

          <CodeBlock
            language="json"
            filename="Webhook Payload: testimonial.created"
            code={`{
  "event": "testimonial.created",
  "id": "evt_9918bc32",
  "timestamp": "2026-03-20T14:12:00Z",
  "data": {
    "id": "tst_1289fe40",
    "project_id": "proj_a901ff23",
    "status": "pending",
    "format": "video",
    "customer": {
      "name": "Sarah Jenkins",
      "company": "ScaleFlow"
    }
  }
}`}
          />

          <h3 className="heading-md text-base mt-6 mb-2">Supported Events</h3>
          <ul className="list-disc pl-5 text-xs text-ink-600 space-y-1 mb-4">
            <li><code>testimonial.created</code> &bull; Customer submitted feedback</li>
            <li><code>testimonial.approved</code> &bull; Moderator approved submission</li>
            <li><code>testimonial.rejected</code> &bull; Moderator rejected submission</li>
            <li><code>testimonial.deleted</code> &bull; Testimonial and media purged</li>
          </ul>
        </section>

        {/* 11. Error Handling */}
        <section id="error-handling" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">11. Error Handling &amp; Status Codes</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise uses standard HTTP status codes. Error responses follow a
            predictable JSON schema:
          </p>

          <CodeBlock
            language="json"
            filename="Response 401 Unauthorized"
            code={`{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid or has been revoked.",
    "status": 401
  }
}`}
          />

          <div className="surface overflow-hidden divide-y divide-line text-xs my-4">
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-16">200 / 201</span>
              <span className="text-ink-600">Success / Resource Created</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-16">400</span>
              <span className="text-ink-600">Bad Request (validation error)</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-16">401</span>
              <span className="text-ink-600">Unauthorized (missing or invalid Bearer key)</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-16">404</span>
              <span className="text-ink-600">Resource Not Found</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-16">413</span>
              <span className="text-ink-600">Payload Too Large (media file exceeds limit)</span>
            </div>
          </div>
        </section>

        {/* 12. Security & Permissions */}
        <section id="security-permissions" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">12. Security &amp; Permissions</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            API keys inherit the role permissions of their creator:
          </p>
          <ul className="list-disc pl-5 text-xs text-ink-600 space-y-1 mb-4">
            <li>
              <strong>Admin Keys:</strong> Can create new projects, revoke API
              keys, and permanently delete submissions.
            </li>
            <li>
              <strong>Moderator Keys:</strong> Can list testimonials, approve or
              hide items, and assign tags.
            </li>
            <li>
              <strong>Publishable Keys:</strong> Read-only access to approved
              testimonials matching specific widget layouts.
            </li>
          </ul>
        </section>

        <DocsPager
          prev={{
            title: "Widgets & Embedding",
            href: "/docs/widgets",
          }}
          next={{
            title: "Production Deployment",
            href: "/docs/deployment",
          }}
        />
      </article>

      <TableOfContents items={tocItems} />
    </div>
  );
}
