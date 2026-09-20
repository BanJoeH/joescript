/**
 * Public-safe view of the reporting rebuild: race MySQL for ~10s, then
 * queue longer work. Source sketch: app/content/diagrams/reporting.mmd
 */
export function ReportingArchitectureDiagram() {
  return (
    <svg
      className="architecture-diagram"
      viewBox="0 0 740 420"
      role="img"
      aria-labelledby="reporting-diagram-title reporting-diagram-desc"
    >
      <title id="reporting-diagram-title">Reporting architecture</title>
      <desc id="reporting-diagram-desc">
        The report UI calls the analytics API, which runs a MySQL query with a ten-second limit.
        Fast queries return inline. Work that exceeds the limit creates a job record, moves through
        an SQS queue to a Lambda worker, stores results, and updates job status. The client polls
        status and fetches results when ready. CloudWatch receives metrics from the API, queue, and
        worker.
      </desc>
      <defs>
        <marker
          id="arch-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path className="architecture-marker" d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>

      {/* Request band */}
      <Box x={20} y={28} width={110} height={40} label="Report UI" />
      <Edge d="M 130 48 H 160" />
      <Box x={160} y={28} width={130} height={40} label="Analytics API" accent />
      <Edge d="M 290 48 H 320" />
      <Box x={320} y={28} width={168} height={40} label="Run query · 10s limit" accent />
      <Edge d="M 488 48 H 520" />
      <Cylinder x={520} y={16} width={100} height={64} label="MySQL" />

      {/* Fast path */}
      <text className="architecture-small" x={404} y={96} textAnchor="middle">
        finishes
      </text>
      <Edge d="M 404 68 V 108" accent />
      <Box x={320} y={108} width={168} height={40} label="Return inline" />

      {/* Slow path */}
      <text className="architecture-small" x={250} y={96} textAnchor="middle">
        exceeds limit
      </text>
      <Edge d="M 320 68 V 90 H 250 V 160 H 85 V 176" />
      <Box x={20} y={176} width={130} height={40} label="Create job record" />
      <Edge d="M 150 196 H 180" />
      <Box x={180} y={176} width={130} height={40} label="SQS work queue" />
      <Edge d="M 310 196 H 340" />
      <Box x={340} y={176} width={120} height={40} label="Lambda worker" accent />
      <Edge d="M 460 196 H 490" />
      <Box x={490} y={176} width={120} height={40} label="S3 results" />

      {/* Worker updates status; client polls status then fetches results */}
      <Edge d="M 400 216 V 248" />
      <Box x={320} y={248} width={160} height={40} label="Job status in MySQL" />
      <Box x={500} y={248} width={110} height={40} label="Client polls" />
      <text className="architecture-small" x={485} y={240} textAnchor="middle">
        poll
      </text>
      <Edge d="M 500 268 H 480" />
      <text className="architecture-small" x={610} y={240} textAnchor="middle">
        fetch results
      </text>
      <Edge d="M 555 248 V 216" />

      {/* Observability — API, queue, and worker only */}
      <Box x={200} y={360} width={140} height={40} label="CloudWatch" />
      <text className="architecture-small" x={270} y={348} textAnchor="middle">
        metrics
      </text>
      <Edge d="M 290 68 H 305 V 12 H 720 V 360 H 340" muted />
      <Edge d="M 245 216 V 360" muted />
      <Edge d="M 340 216 H 270 V 360" muted />
    </svg>
  );
}

function Edge({
  d,
  accent = false,
  muted = false,
}: {
  d: string;
  accent?: boolean;
  muted?: boolean;
}) {
  const className = [
    "architecture-edge",
    accent ? "architecture-edge-accent" : "",
    muted ? "architecture-edge-muted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <path className={className} d={d} markerEnd="url(#arch-arrow)" />;
}

function Box({
  x,
  y,
  width,
  height,
  label,
  accent = false,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect
        className={accent ? "architecture-box architecture-box-accent" : "architecture-box"}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
      />
      <text
        className="architecture-label"
        x={x + width / 2}
        y={y + height / 2 + 4}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function Cylinder({
  x,
  y,
  width,
  height,
  label,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}) {
  const rx = width / 2;
  const cy = y + 8;
  const bottom = y + height - 8;
  return (
    <g>
      <path
        className="architecture-store"
        d={`M ${x} ${cy} L ${x} ${bottom} A ${rx} 8 0 0 0 ${x + width} ${bottom} L ${x + width} ${cy} A ${rx} 8 0 0 0 ${x} ${cy} Z`}
      />
      <ellipse className="architecture-store" cx={x + rx} cy={cy} rx={rx} ry={8} />
      <text className="architecture-label" x={x + rx} y={y + height / 2 + 6} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
