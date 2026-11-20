import {
  LockKeyhole,
  ShieldCheck,
  Zap,
  Star,
  Smartphone,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  groups,
  tools,
  byId,
  feature,
  devices,
  newest,
  localCount,
  toolHref,
} from "../catalog";
import { CategoryIcon, FeaturedIcon } from "./Icons";
const captions = [
  "Brazil · CPF",
  "US · EIN",
  "MOD-97 checks",
  "US test data",
  "Test data only",
  "Local checks",
];
export function ToolLink({ tool, children, ...rest }) {
  return (
    <a
      href={toolHref(tool)}
      target={tool.local ? undefined : "_blank"}
      rel={tool.local ? undefined : "noopener noreferrer"}
      {...rest}
    >
      {children}
      {!tool.local && (
        <ExternalLink className="external" size={13} aria-label="Online tool" />
      )}
    </a>
  );
}
function FeatureCards({ ids, compact = false }) {
  return (
    <div className={"grid " + (compact ? "device-grid" : "")}>
      {ids.map((id, i) => {
        const t = byId.get(id);
        return (
          <ToolLink key={id} tool={t} className="feature card">
            <div className="row">
              <span className="tile">
                <FeaturedIcon index={i + (compact ? 6 : 0)} />
              </span>
              {!compact && <span className="badge">{captions[i]}</span>}
            </div>
            <h3>
              {t.name} <ArrowRight size={15} className="arrow" />
            </h3>
            <p>{t.description}</p>
            {compact && <small>Explore →</small>}
          </ToolLink>
        );
      })}
    </div>
  );
}
export default function Dashboard() {
  return (
    <>
      <div className="hero">
        <h1>{tools.length} Free Developer Tools</h1>
        <p>
          A searchable developer toolbox with {localCount} tools built into this
          app. Browse the full catalog or open a workspace on your device.
        </p>
        <div className="pills">
          {[
            [LockKeyhole, "Local workspaces"],
            [ShieldCheck, "Privacy-focused"],
            [Zap, "Free, no sign-up"],
          ].map(([I, t]) => (
            <span key={t}>
              <I size={15} />
              {t}
            </span>
          ))}
        </div>
      </div>
      <section className="featured">
        <div className="eyebrow">
          <Star size={16} />
          Built for development and QA
        </div>
        <h2>Identity &amp; Tax Test Data</h2>
        <p className="intro">
          Create sample identifiers for form tests and check supported formats.
          Use these fixtures in your development and QA environments.
        </p>
        <FeatureCards ids={feature} />
      </section>
      <section>
        <h2 className="section-title">
          <Smartphone size={18} />
          Test your device in the browser
        </h2>
        <div className="device-box">
          <FeatureCards compact ids={devices} />
        </div>
      </section>
      <section>
        <div className="row">
          <h2>New Tools</h2>
          <a className="inline" href="#/list/new">
            Browse all →
          </a>
        </div>
        <div className="strip">
          {newest.map((id) => (
            <ToolLink key={id} tool={byId.get(id)} className="card">
              <h3>{byId.get(id).name}</h3>
              <small>
                {groups.find((g) => g.id === byId.get(id).category).name}
              </small>
            </ToolLink>
          ))}
        </div>
      </section>
      <section>
        <h2>Browse by category</h2>
        <p>
          Pick a category or press <kbd>Ctrl K</kbd> to find a tool.
        </p>
        <div className="grid">
          {groups.map((g, i) => (
            <a className="card" href={"#/category/" + g.id} key={g.id}>
              <div className="row">
                <span className="tile">
                  <CategoryIcon index={i} />
                </span>
                <span className="badge">{g.tools.length}</span>
              </div>
              <h3>{g.name}</h3>
              <p>
                {g.tools
                  .slice(0, 3)
                  .map((t) => t.name)
                  .join(" · ")}
              </p>
            </a>
          ))}
        </div>
      </section>
      <section>
        <h2>Frequently asked questions</h2>
        {[
          [
            "Which tools work offline?",
            localCount +
              " tools run inside this download. Select “Local only” in a category or search to find them. Online entries open the original website.",
          ],
          [
            "Where are my favorites saved?",
            "Your browser stores favorites, recent tools, the theme and tracker entries on this PC.",
          ],
          [
            "How can I add a tool?",
            "The README includes a complete example. The app automatically discovers module files and adds their tools to search and navigation.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
