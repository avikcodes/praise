import {
  CheckCircle2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { TableOfContents, type TocItem } from "@/components/docs/toc";
import { DocsPager } from "@/components/docs/pager";
import { CodeBlock } from "@/components/docs/code-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "REST API Reference — Praise Core v1",
  description:
    "Complete technical reference for the Praise Core v1 REST API: Bearer authentication, API key management, projects, forms, testimonials, customers, tags, widgets, pagination, error schemas, and public endpoints.",
  path: "/docs/api-reference",
});

const tocItems: TocItem[] = [
  { id: "api-overview", title: "1. API Overview & Architecture" },
  { id: "authentication", title: "2. Authentication & Key Types" },
  { id: "api-keys-management", title: "3. API Key Management" },
  { id: "workspaces-endpoints", title: "4. Workspaces Endpoints" },
  { id: "projects-endpoints", title: "5. Projects Endpoints" },
  { id: "customers-endpoints", title: "6. Customers Endpoints" },
  { id: "forms-endpoints", title: "7. Collection Forms Endpoints" },
  { id: "testimonials-endpoints", title: "8. Testimonials Endpoints" },
  { id: "tags-taxonomy", title: "9. Tags & Taxonomy" },
  { id: "widgets-endpoints", title: "10. Widgets Configuration" },
  { id: "public-endpoints", title: "11. Approved Public Endpoints" },
  { id: "pagination-filtering", title: "12. Pagination, Filtering & Sorting" },
  { id: "rate-limiting", title: "13. Rate Limiting & Headers" },
  { id: "error-handling", title: "14. Error Handling & Status Codes" },
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
            <StatusBadge status="available" label="Implemented v1.0" />
          </div>
          <h1 className="display text-3xl sm:text-4xl">REST API Reference</h1>
          <p className="lead mt-3 text-base text-ink-600">
            Official technical documentation for the Praise Core REST API.
            Manage workspaces, projects, forms, customer profiles, moderated
            testimonials, tag taxonomies, and widget configurations over HTTPS.
          </p>
        </div>

        {/* 1. API Overview */}
        <section id="api-overview" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">1. API Overview &amp; Architecture</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            The Praise REST API is rooted under <code>/api/v1</code>. All
            management operations enforce strict multi-tenant workspace isolation,
            cryptographic Bearer token authorization, input validation, and
            sliding-window rate limiting.
          </p>

          <div className="surface p-4 font-mono text-xs text-ink-800 space-y-1.5 my-4">
            <div>
              <span className="text-ink-400">Base URL: </span>
              <code>https://praise.yourdomain.com/api/v1</code>
            </div>
            <div>
              <span className="text-ink-400">Data Format: </span>
              <code>JSON (application/json; charset=utf-8)</code>
            </div>
            <div>
              <span className="text-ink-400">API Version: </span>
              <code>2026-11-01 (reflected in API-Version header)</code>
            </div>
            <div>
              <span className="text-ink-400">Security: </span>
              <code>TLS 1.2 / 1.3, SHA-256 key hashing, scoped RBAC</code>
            </div>
          </div>
        </section>

        {/* 2. Authentication & Key Types */}
        <section id="authentication" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">2. Authentication &amp; Key Types</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Authenticate management requests by supplying a Bearer token in the{" "}
            <code>Authorization</code> HTTP header (or via <code>X-API-Key</code>):
          </p>

          <CodeBlock
            language="http"
            filename="HTTP Header"
            code={`Authorization: Bearer praise_live_sk_7b31048e91f041289c8491024ab71c89`}
          />

          <h3 className="heading-md text-base mt-6 mb-2">Supported Key Types</h3>
          <div className="surface overflow-hidden divide-y divide-line text-xs">
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-36 shrink-0">
                Secret Live Key
              </span>
              <span className="text-ink-600">
                Prefix <code>praise_live_sk_</code> &bull; Keep on secure servers.
                Carries workspace roles (<code>OWNER</code>, <code>ADMIN</code>, <code>MEMBER</code>).
                Enables full read/write management of testimonials, forms, and customers.
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-36 shrink-0">
                Publishable Key
              </span>
              <span className="text-ink-600">
                Prefix <code>praise_pk_</code> &bull; Safe to expose in frontend script
                tags and client bundles. Grants read-only access to approved public
                testimonials only. Disallows all write mutations and private routes.
              </span>
            </div>
          </div>
        </section>

        {/* 3. API Key Management */}
        <section id="api-keys-management" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">3. API Key Management</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Administrators and workspace owners can programmatically provision and
            revoke API keys:
          </p>

          <div className="space-y-4 my-4">
            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-emerald-700">GET </span>
              <code>/api/v1/auth/keys</code>
              <span className="text-ink-400 ml-2">— List active keys (showing keyPrefix, role, createdAt)</span>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-brand-700">POST </span>
              <code>/api/v1/auth/keys</code>
              <span className="text-ink-400 ml-2">— Generate a new API key</span>
            </div>

            <CodeBlock
              language="bash"
              filename="cURL: Create API Key"
              code={`curl -X POST https://praise.yourdomain.com/api/v1/auth/keys \\
  -H "Authorization: Bearer praise_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Widget Loader",
    "type": "PUBLISHABLE",
    "role": "MEMBER"
  }'`}
            />

            <CodeBlock
              language="json"
              filename="Response 201 Created (Raw key returned once)"
              code={`{
  "data": {
    "id": "cm3b1x8...",
    "name": "Production Widget Loader",
    "keyPrefix": "praise_pk_8f29...",
    "key": "praise_pk_8f29c4179e8a0028e3b1c78e90a2bf41",
    "type": "PUBLISHABLE",
    "role": "MEMBER",
    "createdAt": "2026-11-09T18:00:00.000Z"
  }
}`}
            />

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-rose-700">DELETE </span>
              <code>/api/v1/auth/keys/:id</code>
              <span className="text-ink-400 ml-2">— Revoke and purge an API key</span>
            </div>
          </div>
        </section>

        {/* 4. Workspaces Endpoints */}
        <section id="workspaces-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">4. Workspaces Endpoints</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Inspect or update the primary workspace tied to the authenticated key:
          </p>

          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-emerald-700">GET </span>
            <code>/api/v1/workspaces</code>
          </div>

          <CodeBlock
            language="json"
            filename="Response 200 OK"
            code={`{
  "data": {
    "id": "ws_cuid1234",
    "name": "Acme SaaS",
    "slug": "acme-saas",
    "logoUrl": "https://praise.yourdomain.com/storage/uploads/logo.png",
    "createdAt": "2026-11-01T10:00:00.000Z",
    "updatedAt": "2026-11-09T14:00:00.000Z",
    "stats": {
      "projectsCount": 3,
      "testimonialsCount": 42,
      "customersCount": 38,
      "widgetsCount": 4
    }
  }
}`}
          />
        </section>

        {/* 5. Projects Endpoints */}
        <section id="projects-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">5. Projects Endpoints</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Projects segment forms, testimonials, and widgets:
          </p>

          <div className="space-y-4 my-4">
            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-emerald-700">GET </span>
              <code>/api/v1/projects?page=1&amp;limit=20&amp;sort_by=createdAt&amp;order=desc</code>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-brand-700">POST </span>
              <code>/api/v1/projects</code>
            </div>

            <CodeBlock
              language="bash"
              filename="cURL: Create Project"
              code={`curl -X POST https://praise.yourdomain.com/api/v1/projects \\
  -H "Authorization: Bearer praise_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Cloud Core Platform",
    "slug": "cloud-core",
    "description": "Enterprise cloud telemetry suite",
    "color": "#7049D8"
  }'`}
            />

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-amber-700">PATCH </span>
              <code>/api/v1/projects/:id</code>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-rose-700">DELETE </span>
              <code>/api/v1/projects/:id</code>
            </div>
          </div>
        </section>

        {/* 6. Customers Endpoints */}
        <section id="customers-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">6. Customers Endpoints</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Manage respondent and customer profiles. Customer email addresses are
            accessible through this management API, but strictly stripped from
            public feeds:
          </p>

          <div className="space-y-4 my-4">
            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-emerald-700">GET </span>
              <code>/api/v1/customers?search=scale&amp;page=1&amp;limit=20</code>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-brand-700">POST </span>
              <code>/api/v1/customers</code>
            </div>

            <CodeBlock
              language="json"
              filename="Response 200 OK (Single Customer)"
              code={`{
  "data": {
    "id": "cust_8820f1",
    "workspaceId": "ws_cuid1234",
    "name": "Sarah Jenkins",
    "email": "sarah@scaleflow.example",
    "company": "ScaleFlow",
    "title": "VP of Product",
    "avatarUrl": "https://praise.yourdomain.com/storage/uploads/avatars/sarah.jpg",
    "socialHandle": "@sarahjenkins",
    "createdAt": "2026-11-05T12:00:00.000Z",
    "updatedAt": "2026-11-09T08:00:00.000Z"
  }
}`}
            />

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-amber-700">PATCH </span>
              <code>/api/v1/customers/:id</code>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-rose-700">DELETE </span>
              <code>/api/v1/customers/:id</code>
            </div>
          </div>
        </section>

        {/* 7. Collection Forms Endpoints */}
        <section id="forms-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">7. Collection Forms Endpoints</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Programmatically query form setups or create new feedback intake links:
          </p>

          <div className="space-y-4 my-4">
            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-emerald-700">GET </span>
              <code>/api/v1/forms?project_id=proj_a901</code>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-brand-700">POST </span>
              <code>/api/v1/forms</code>
            </div>

            <CodeBlock
              language="json"
              filename="Request Payload: POST /api/v1/forms"
              code={`{
  "projectId": "proj_a901",
  "title": "Feedback for Cloud Core",
  "slug": "cloud-core-feedback",
  "headerPrompt": "How did Cloud Core help your engineering workflow?",
  "thankYouMessage": "Thank you for supporting our open-source journey!",
  "allowVideo": true,
  "allowAudio": true,
  "allowText": true,
  "maxVideoDurationSeconds": 120
}`}
            />
          </div>
        </section>

        {/* 8. Testimonials Endpoints */}
        <section id="testimonials-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">8. Testimonials Endpoints</h2>

          <h3 className="heading-md text-base mt-4 mb-2">Query &amp; Filter Testimonials</h3>
          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-emerald-700">GET </span>
            <code>/api/v1/testimonials?status=APPROVED&amp;min_rating=4&amp;type=VIDEO&amp;page=1&amp;limit=20</code>
          </div>

          <CodeBlock
            language="json"
            filename="Response 200 OK"
            code={`{
  "data": [
    {
      "id": "tst_1289fe40",
      "workspaceId": "ws_cuid1234",
      "projectId": "proj_a901",
      "content": "Praise gave us full ownership over our video testimonial assets.",
      "rating": 5,
      "type": "VIDEO",
      "status": "APPROVED",
      "isFeatured": true,
      "submittedAt": "2026-11-06T15:30:00.000Z",
      "customer": {
        "id": "cust_8820f1",
        "name": "Sarah Jenkins",
        "email": "sarah@scaleflow.example",
        "company": "ScaleFlow",
        "title": "VP of Product",
        "avatarUrl": "https://praise.yourdomain.com/storage/uploads/avatars/sarah.jpg"
      },
      "mediaAssets": [
        {
          "id": "med_99a1",
          "type": "VIDEO",
          "url": "/api/media/med_99a1",
          "mimeType": "video/webm",
          "fileSizeBytes": 12450000,
          "durationSeconds": 42
        }
      ],
      "tags": [
        { "id": "tag_enterprise", "name": "Enterprise", "slug": "enterprise", "color": "#7049D8" }
      ]
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasMore": true
  }
}`}
          />

          <h3 className="heading-md text-base mt-6 mb-2">Moderate / Update Testimonial</h3>
          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-amber-700">PATCH </span>
            <code>/api/v1/testimonials/:id</code>
          </div>

          <CodeBlock
            language="json"
            filename="Request: Approve & Feature Testimonial"
            code={`{
  "status": "APPROVED",
  "isFeatured": true,
  "tagIds": ["tag_enterprise", "tag_speed"]
}`}
          />
        </section>

        {/* 9. Tags & Taxonomy */}
        <section id="tags-taxonomy" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">9. Tags &amp; Taxonomy</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Organize testimonials across feature tags and marketing campaigns:
          </p>

          <div className="space-y-4 my-4">
            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-emerald-700">GET </span>
              <code>/api/v1/tags</code>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-brand-700">POST </span>
              <code>/api/v1/tags</code>
            </div>

            <CodeBlock
              language="json"
              filename="Request: Create Tag"
              code={`{
  "name": "Cost Reduction",
  "slug": "cost-reduction",
  "color": "#059669"
}`}
            />
          </div>
        </section>

        {/* 10. Widgets Configuration */}
        <section id="widgets-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">10. Widgets Configuration</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Configure embeddable presentation units (Grid, Carousel, Quote Card,
            List, Wall of Love):
          </p>

          <div className="space-y-4 my-4">
            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-emerald-700">GET </span>
              <code>/api/v1/widgets?project_id=proj_a901</code>
            </div>

            <div className="surface p-3 font-mono text-xs">
              <span className="font-bold text-brand-700">POST </span>
              <code>/api/v1/widgets</code>
            </div>

            <CodeBlock
              language="json"
              filename="Request: Create Grid Widget"
              code={`{
  "name": "Homepage Proof Grid",
  "projectId": "proj_a901",
  "type": "GRID",
  "theme": "LIGHT",
  "config": {
    "columns": 3,
    "showRatings": true,
    "showAvatars": true,
    "minRating": 4,
    "tag": "enterprise"
  }
}`}
            />
          </div>
        </section>

        {/* 11. Approved Public Endpoints */}
        <section id="public-endpoints" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">11. Approved Public Endpoints</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Safe, public read-only endpoints designed for websites, widgets, and
            mobile apps. Accessible via publishable keys (<code>praise_pk_...</code>)
            or public workspace/project slugs:
          </p>

          <div className="surface border-emerald-200 bg-emerald-50/50 p-4 mb-4 flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
            <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <strong>Privacy Guarantee:</strong> Public endpoints return ONLY
              testimonials marked <code>APPROVED</code>. Customer email addresses,
              private notes, submitter IPs, and unapproved records are strictly
              filtered out at the database query level.
            </div>
          </div>

          <div className="surface p-3 font-mono text-xs mb-3">
            <span className="font-bold text-emerald-700">GET </span>
            <code>/api/v1/public/testimonials?project_slug=cloud-core&amp;min_rating=5</code>
          </div>

          <CodeBlock
            language="json"
            filename="Response 200 OK (Public Sanitized Payload)"
            code={`{
  "data": [
    {
      "id": "tst_1289fe40",
      "content": "Praise gave us full ownership over our video testimonial assets.",
      "rating": 5,
      "type": "VIDEO",
      "isFeatured": true,
      "submittedAt": "2026-11-06T15:30:00.000Z",
      "customer": {
        "name": "Sarah Jenkins",
        "company": "ScaleFlow",
        "title": "VP of Product",
        "avatarUrl": "https://praise.yourdomain.com/storage/uploads/avatars/sarah.jpg",
        "socialHandle": "@sarahjenkins"
      },
      "media": [
        {
          "id": "med_99a1",
          "type": "VIDEO",
          "url": "/api/media/med_99a1",
          "mimeType": "video/webm",
          "fileSizeBytes": 12450000,
          "durationSeconds": 42
        }
      ],
      "tags": ["Enterprise"]
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasMore": false
  }
}`}
          />
        </section>

        {/* 12. Pagination, Filtering & Sorting */}
        <section id="pagination-filtering" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">12. Pagination, Filtering &amp; Sorting</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            All listing endpoints support standard query parameters:
          </p>

          <div className="surface overflow-hidden divide-y divide-line text-xs">
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-32 shrink-0">page</code>
              <span className="text-ink-600">Page number (default: <code>1</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-32 shrink-0">limit</code>
              <span className="text-ink-600">Items per page (default: <code>20</code>, maximum: <code>100</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-32 shrink-0">sort_by</code>
              <span className="text-ink-600">Field name (e.g. <code>submittedAt</code>, <code>rating</code>, <code>createdAt</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-32 shrink-0">order</code>
              <span className="text-ink-600">Sort direction: <code>asc</code> or <code>desc</code> (default: <code>desc</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-32 shrink-0">search / q</code>
              <span className="text-ink-600">Full-text case-insensitive query across text and customer names.</span>
            </div>
          </div>
        </section>

        {/* 13. Rate Limiting */}
        <section id="rate-limiting" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">13. Rate Limiting &amp; Headers</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Requests are tracked using an in-memory sliding window limiter:
          </p>
          <ul className="list-disc pl-5 text-xs text-ink-600 space-y-1 mb-4">
            <li><strong>Secret Keys:</strong> 120 requests per minute.</li>
            <li><strong>Publishable Keys:</strong> 300 requests per minute.</li>
          </ul>

          <p className="muted text-xs leading-relaxed mb-2">Every response returns rate status headers:</p>
          <CodeBlock
            language="http"
            filename="Rate Limiting Headers"
            code={`X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 54`}
          />
        </section>

        {/* 14. Error Handling */}
        <section id="error-handling" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">14. Error Handling &amp; Status Codes</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            All error responses follow a deterministic JSON format:
          </p>

          <CodeBlock
            language="json"
            filename="Standard Error Envelope"
            code={`{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid, inactive, or has expired.",
    "status": 401
  }
}`}
          />

          <div className="surface overflow-hidden divide-y divide-line text-xs my-4">
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-20 shrink-0">400</span>
              <span className="text-ink-600">Bad Request (<code>validation_error</code>, <code>invalid_request</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-20 shrink-0">401</span>
              <span className="text-ink-600">Unauthorized (<code>unauthorized</code>, <code>invalid_api_key</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-20 shrink-0">403</span>
              <span className="text-ink-600">Forbidden (<code>forbidden</code>, <code>insufficient_permissions</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-20 shrink-0">404</span>
              <span className="text-ink-600">Not Found (<code>project_not_found</code>, <code>testimonial_not_found</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-20 shrink-0">409</span>
              <span className="text-ink-600">Conflict (<code>slug_conflict</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <span className="font-mono font-semibold text-ink-900 w-20 shrink-0">429</span>
              <span className="text-ink-600">Too Many Requests (<code>rate_limit_exceeded</code>). Returns <code>Retry-After</code>.</span>
            </div>
          </div>
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
