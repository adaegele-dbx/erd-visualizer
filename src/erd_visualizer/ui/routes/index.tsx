import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/apx/navbar";
import {
  useListCatalogs,
  useListSchemas,
  useGetSchemaERD,
  type CatalogOut,
  type SchemaOut,
  type TableInfo,
  type RelationshipInfo,
  type ColumnInfo,
  ApiError,
} from "@/lib/api";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Search, LayoutGrid } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => <Index />,
});

// Icons
function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

function SchemaIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

// Error modal
function ErrorModal({ isOpen, onClose, title, message }: { isOpen: boolean; onClose: () => void; title: string; message: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Single Table Component with expand/collapse functionality
function ERDTable({
  table,
  x,
  y,
  tableWidth,
  headerHeight,
  rowHeight,
  expanded,
  onToggleExpand,
}: {
  table: TableInfo;
  x: number;
  y: number;
  tableWidth: number;
  headerHeight: number;
  rowHeight: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  // Separate key columns from other columns
  const keyColumns = table.columns.filter((col) => col.constraint_type === "PRIMARY KEY" || col.constraint_type === "FOREIGN KEY");
  const otherColumns = table.columns.filter((col) => col.constraint_type !== "PRIMARY KEY" && col.constraint_type !== "FOREIGN KEY");
  
  // When collapsed, show at least 3 columns (keys first, then fill with other columns)
  const MIN_VISIBLE_COLUMNS = 3;
  const collapsedColumns = keyColumns.length >= MIN_VISIBLE_COLUMNS 
    ? keyColumns 
    : [...keyColumns, ...otherColumns.slice(0, MIN_VISIBLE_COLUMNS - keyColumns.length)];
  
  const displayedColumns = expanded ? [...keyColumns, ...otherColumns] : collapsedColumns;
  const hiddenColumnCount = table.columns.length - collapsedColumns.length;
  const hasHiddenColumns = hiddenColumnCount > 0;
  
  const buttonHeight = hasHiddenColumns ? 24 : 0;
  const tableHeight = headerHeight + displayedColumns.length * rowHeight + buttonHeight + 8;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Table background */}
      <rect width={tableWidth} height={tableHeight} rx="6" fill="var(--color-card)" stroke="var(--color-border)" strokeWidth="1" />

      {/* Header */}
      <rect width={tableWidth} height={headerHeight} rx="6" fill="var(--color-primary)" />
      <rect y={headerHeight - 6} width={tableWidth} height={6} fill="var(--color-primary)" />
      <text x={tableWidth / 2} y={headerHeight / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="var(--color-primary-foreground)" fontSize="12" fontWeight="600">
        {table.table_name}
      </text>

      {/* Columns */}
      {displayedColumns.map((col, colIdx) => {
        const isPK = col.constraint_type === "PRIMARY KEY";
        const isFK = col.constraint_type === "FOREIGN KEY";
        const colY = headerHeight + colIdx * rowHeight;

        return (
          <g key={col.column_name} transform={`translate(0, ${colY})`}>
            {colIdx > 0 && <line x1="8" y1="0" x2={tableWidth - 8} y2="0" stroke="var(--color-border)" strokeWidth="0.5" />}
            {/* Key icon - inline SVG path */}
            {(isPK || isFK) && (
              <g transform="translate(8, 4)">
                <circle cx="4" cy="8" r="3" fill="none" stroke={isPK ? "#f59e0b" : "#3b82f6"} strokeWidth="1.5" />
                <path d={`M 7 5 L 11 1`} fill="none" stroke={isPK ? "#f59e0b" : "#3b82f6"} strokeWidth="1.5" strokeLinecap="round" />
                <path d={`M 9 3 L 11 5 L 12 4 L 10 2`} fill="none" stroke={isPK ? "#f59e0b" : "#3b82f6"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
            <text x={isPK || isFK ? 24 : 8} y={rowHeight / 2 + 1} dominantBaseline="middle" fill="var(--color-foreground)" fontSize="11">
              {col.column_name}
            </text>
            <text x={tableWidth - 8} y={rowHeight / 2 + 1} textAnchor="end" dominantBaseline="middle" fill="var(--color-muted-foreground)" fontSize="10">
              {col.data_type}
            </text>
          </g>
        );
      })}

      {/* Expand/Collapse button */}
      {hasHiddenColumns && (
        <g
          transform={`translate(0, ${headerHeight + displayedColumns.length * rowHeight})`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          style={{ cursor: "pointer" }}
        >
          <line x1="8" y1="0" x2={tableWidth - 8} y2="0" stroke="var(--color-border)" strokeWidth="0.5" />
          <rect x="0" y="0" width={tableWidth} height={buttonHeight} fill="transparent" />
          {/* Plus/Minus icon - inline SVG path */}
          <g transform={`translate(${tableWidth / 2 - 20}, 6)`}>
            {expanded ? (
              <path d="M 0 6 L 12 6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <>
                <path d="M 6 0 L 6 12" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="2" strokeLinecap="round" />
                <path d="M 0 6 L 12 6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </g>
          <text x={tableWidth / 2} y={buttonHeight / 2 + 1} dominantBaseline="middle" fill="var(--color-muted-foreground)" fontSize="10">
            {expanded ? "Hide" : `+${hiddenColumnCount} more`}
          </text>
        </g>
      )}
    </g>
  );
}

// ERD Diagram Component
function ERDDiagram({ tables, relationships }: { tables: TableInfo[]; relationships: RelationshipInfo[] }) {
  const TABLE_WIDTH = 220;
  const HEADER_HEIGHT = 32;
  const ROW_HEIGHT = 24;
  const BUTTON_HEIGHT = 24;
  const TABLE_GAP_X = 50;
  const TABLE_GAP_Y = 28;
  const COLS = Math.ceil(Math.sqrt(tables.length));

  // User drag offsets from grid (dx, dy); cleared on "Reset layout"
  const [tableOffsets, setTableOffsets] = useState<Record<string, { dx: number; dy: number }>>({});

  // Zoom/pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFittedRef = useRef(false);
  const dragStartRef = useRef({
    viewportX: 0,
    viewportY: 0,
    tableX: 0,
    tableY: 0,
    gridX: 0,
    gridY: 0,
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const [draggingTable, setDraggingTable] = useState<string | null>(null);

  // Track which tables are expanded
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const toggleTableExpand = useCallback((tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  }, []);

  // Helper to get displayed columns for a table
  const MIN_VISIBLE_COLUMNS = 3;
  const getDisplayedColumns = useCallback(
    (table: TableInfo): ColumnInfo[] => {
      const keyColumns = table.columns.filter((col) => col.constraint_type === "PRIMARY KEY" || col.constraint_type === "FOREIGN KEY");
      const otherColumns = table.columns.filter((col) => col.constraint_type !== "PRIMARY KEY" && col.constraint_type !== "FOREIGN KEY");
      
      // When collapsed, show at least 3 columns (keys first, then fill with other columns)
      const collapsedColumns = keyColumns.length >= MIN_VISIBLE_COLUMNS 
        ? keyColumns 
        : [...keyColumns, ...otherColumns.slice(0, MIN_VISIBLE_COLUMNS - keyColumns.length)];
      
      return expandedTables.has(table.table_name) ? [...keyColumns, ...otherColumns] : collapsedColumns;
    },
    [expandedTables]
  );

  // Helper to check if table has hidden columns beyond the minimum visible
  const hasHiddenColumns = useCallback((table: TableInfo): boolean => {
    const keyColumns = table.columns.filter((col) => col.constraint_type === "PRIMARY KEY" || col.constraint_type === "FOREIGN KEY");
    const otherColumns = table.columns.filter((col) => col.constraint_type !== "PRIMARY KEY" && col.constraint_type !== "FOREIGN KEY");
    const collapsedColumns = keyColumns.length >= MIN_VISIBLE_COLUMNS 
      ? keyColumns 
      : [...keyColumns, ...otherColumns.slice(0, MIN_VISIBLE_COLUMNS - keyColumns.length)];
    return table.columns.length > collapsedColumns.length;
  }, []);

  // Zoom/pan: reset to 100%
  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Zoom toward cursor (used by wheel)
  const zoomAt = useCallback((clientX: number, clientY: number, delta: number) => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const factor = delta > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.2, scale * factor));
    const newTx = x - (x - translate.x) * (newScale / scale);
    const newTy = y - (y - translate.y) * (newScale / scale);
    setScale(newScale);
    setTranslate({ x: newTx, y: newTy });
  }, [scale, translate]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY);
    },
    [zoomAt]
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsPanning(true);
    lastPanRef.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  }, [translate]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setTranslate({ x: e.clientX - lastPanRef.current.x, y: e.clientY - lastPanRef.current.y });
    },
    [isPanning]
  );

  const onMouseUp = useCallback(() => setIsPanning(false), []);
  const onMouseLeave = useCallback(() => setIsPanning(false), []);

  // Order tables for smarter default layout: put most-referenced (many incoming FKs) toward center so related tables are closer
  const orderedTables = useMemo(() => {
    const refCount = new Map<string, number>();
    tables.forEach((t) => refCount.set(t.table_name, 0));
    relationships.forEach((r) => refCount.set(r.target_table, (refCount.get(r.target_table) ?? 0) + 1));
    return [...tables].sort((a, b) => (refCount.get(b.table_name) ?? 0) - (refCount.get(a.table_name) ?? 0));
  }, [tables, relationships]);

  // Calculate table positions (use orderedTables for layout)
  const tablePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; height: number }> = {};
    let maxHeightInRow = 0;
    let currentY = 20;

    orderedTables.forEach((table, index) => {
      const col = index % COLS;
      const displayedColumns = getDisplayedColumns(table);
      const buttonHeight = hasHiddenColumns(table) ? BUTTON_HEIGHT : 0;
      const tableHeight = HEADER_HEIGHT + displayedColumns.length * ROW_HEIGHT + buttonHeight + 8;

      if (col === 0 && index > 0) {
        currentY += maxHeightInRow + TABLE_GAP_Y;
        maxHeightInRow = 0;
      }

      positions[table.table_name] = {
        x: 20 + col * (TABLE_WIDTH + TABLE_GAP_X),
        y: currentY,
        height: tableHeight,
      };

      maxHeightInRow = Math.max(maxHeightInRow, tableHeight);
    });

    return positions;
  }, [orderedTables, getDisplayedColumns, hasHiddenColumns]);

  // Display positions: grid + user drag offsets (so boxes are draggable)
  const displayPositions = useMemo(() => {
    const out: Record<string, { x: number; y: number; height: number }> = {};
    for (const [name, grid] of Object.entries(tablePositions)) {
      const off = tableOffsets[name];
      out[name] = {
        x: grid.x + (off?.dx ?? 0),
        y: grid.y + (off?.dy ?? 0),
        height: grid.height,
      };
    }
    return out;
  }, [tablePositions, tableOffsets]);

  // SVG viewport: include minX/minY so when tables are dragged left/up we don't get a black margin
  const svgDimensions = useMemo(() => {
    if (Object.keys(displayPositions).length === 0) return { width: 400, height: 300, minX: 0, minY: 0 };
    const positions = Object.values(displayPositions);
    const minX = Math.min(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxX = Math.max(...positions.map((p) => p.x + TABLE_WIDTH));
    const maxY = Math.max(...positions.map((p) => p.y + p.height));
    const padding = 40;
    return {
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      minX,
      minY,
    };
  }, [displayPositions]);

  // Zoom/pan: fit to view (defined after tablePositions/svgDimensions to avoid TDZ)
  const fitToView = useCallback(() => {
    if (!containerRef.current || Object.keys(displayPositions).length === 0) return;
    const el = containerRef.current;
    const padding = 40;
    const viewW = el.clientWidth - padding * 2;
    const viewH = el.clientHeight - padding * 2;
    const contentW = svgDimensions.width;
    const contentH = svgDimensions.height;
    const s = Math.min(viewW / contentW, viewH / contentH, 1.2);
    setScale(s);
    setTranslate({ x: (el.clientWidth - contentW * s) / 2, y: (el.clientHeight - contentH * s) / 2 });
  }, [displayPositions, svgDimensions]);

  // Fit to view when diagram first loads (wait for container to have real size so ERD is centered)
  useEffect(() => {
    if (tables.length === 0 || !containerRef.current) return;
    const el = containerRef.current;
    const runFit = () => {
      if (hasFittedRef.current) return;
      if (el.clientWidth > 0 && el.clientHeight > 0 && Object.keys(displayPositions).length > 0) {
        hasFittedRef.current = true;
        fitToView();
      }
    };
    runFit();
    const ro = new ResizeObserver(() => runFit());
    ro.observe(el);
    const t1 = setTimeout(runFit, 200);
    const t2 = setTimeout(runFit, 500);
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tables.length, displayPositions, fitToView]);

  const resetLayout = useCallback(() => setTableOffsets({}), []);

  const onTableMouseDown = useCallback(
    (e: React.MouseEvent, tableName: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const pos = displayPositions[tableName];
      const grid = tablePositions[tableName];
      if (!pos || !grid || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportX = (e.clientX - rect.left - translate.x) / scale;
      const viewportY = (e.clientY - rect.top - translate.y) / scale;
      dragStartRef.current = {
        viewportX,
        viewportY,
        tableX: pos.x,
        tableY: pos.y,
        gridX: grid.x,
        gridY: grid.y,
        scale,
        translateX: translate.x,
        translateY: translate.y,
      };
      setDraggingTable(tableName);
    },
    [displayPositions, tablePositions, translate, scale]
  );

  // Window-level drag: use viewport-space deltas so movement is 1:1 in all directions (minX/minY change when dragging left/up would otherwise make content-space jump)
  useEffect(() => {
    if (!draggingTable) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { viewportX, viewportY, tableX, tableY, gridX, gridY, scale: s, translateX: tx, translateY: ty } = dragStartRef.current;
      const currentVx = (e.clientX - rect.left - tx) / s;
      const currentVy = (e.clientY - rect.top - ty) / s;
      const deltaX = currentVx - viewportX;
      const deltaY = currentVy - viewportY;
      setTableOffsets((prev) => ({
        ...prev,
        [draggingTable]: { dx: tableX + deltaX - gridX, dy: tableY + deltaY - gridY },
      }));
    };
    const onUp = () => setDraggingTable(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingTable]);

  // Draw relationship lines (use display positions so lines follow dragged tables)
  const relationshipPaths = useMemo(() => {
    return relationships
      .map((rel, idx) => {
        const sourcePos = displayPositions[rel.source_table];
        const targetPos = displayPositions[rel.target_table];
        if (!sourcePos || !targetPos) return null;

        const sourceTable = tables.find((t) => t.table_name === rel.source_table);
        const targetTable = tables.find((t) => t.table_name === rel.target_table);
        if (!sourceTable || !targetTable) return null;

        const sourceDisplayedCols = getDisplayedColumns(sourceTable);
        const targetDisplayedCols = getDisplayedColumns(targetTable);

        const sourceColIdx = sourceDisplayedCols.findIndex((c) => c.column_name === rel.source_column);
        const targetColIdx = targetDisplayedCols.findIndex((c) => c.column_name === rel.target_column);

        // If column is not visible, connect to table header
        const sourceY = sourceColIdx >= 0 ? sourcePos.y + HEADER_HEIGHT + sourceColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 : sourcePos.y + HEADER_HEIGHT / 2;
        const targetY = targetColIdx >= 0 ? targetPos.y + HEADER_HEIGHT + targetColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 : targetPos.y + HEADER_HEIGHT / 2;

        const sourceRight = sourcePos.x + TABLE_WIDTH;
        const targetLeft = targetPos.x;
        const sourceLeft = sourcePos.x;
        const targetRight = targetPos.x + TABLE_WIDTH;

        // Orthogonal (elbowed) path: horizontal → vertical → horizontal so it's clear which fields connect
        let startX: number, endX: number;
        let midX: number;
        const stagger = (idx - (relationships.length - 1) / 2) * 14;
        const elbowClearance = 30; // gap so vertical segment goes around tables, not through them

        if (sourceRight <= targetLeft) {
          // Source left of target: line goes right from source, vertical in gap, left to target
          startX = sourceRight;
          endX = targetLeft;
          const baseMidX = (startX + endX) / 2;
          midX = Math.max(startX, Math.min(endX, baseMidX + stagger));
        } else if (sourceLeft >= targetRight) {
          // Source right of target: line goes left from source, vertical in gap, right to target
          startX = sourceLeft;
          endX = targetRight;
          const baseMidX = (startX + endX) / 2;
          midX = Math.max(endX, Math.min(startX, baseMidX + stagger));
        } else {
          // Overlapping (e.g. stacked vertically): route vertical segment to the RIGHT of both tables so the line doesn't cut through
          startX = sourceRight;
          endX = targetRight;
          midX = Math.max(sourceRight, targetRight) + elbowClearance + stagger;
        }
        const path = `M ${startX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${endX} ${targetY}`;
        const tooltip = `${rel.source_table}.${rel.source_column} → ${rel.target_table}.${rel.target_column}`;

        return (
          <g key={idx} style={{ cursor: "help" }}>
            <title>{tooltip}</title>
            <path d={path} fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1.5" opacity="0.85" markerEnd="url(#arrowhead)" />
            <circle cx={startX} cy={sourceY} r="4" fill="var(--color-muted-foreground)" opacity="0.85" />
          </g>
        );
      })
      .filter(Boolean);
  }, [relationships, displayPositions, tables, getDisplayedColumns]);

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No tables found in this schema</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-muted/30 rounded-lg overflow-hidden">
      {/* Diagram toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-card/80 shrink-0">
        <button
          type="button"
          onClick={fitToView}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Fit to view"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Reset zoom (100%)"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAt(0, 0, 1)}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAt(0, 0, -1)}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="ml-2 text-xs text-muted-foreground tabular-nums">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          onClick={resetLayout}
          className="ml-2 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Reset layout (snap tables back to grid)"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>

      {/* Pannable/zoomable diagram area */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden flex items-center justify-center select-none ${draggingTable ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"}`}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{ touchAction: "none" }}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <svg width={svgDimensions.width} height={svgDimensions.height} style={{ minWidth: svgDimensions.width, minHeight: svgDimensions.height }}>
            <defs>
              {/* Traditional ERD: small open arrow (stroke only), not a big filled triangle */}
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
              </marker>
            </defs>
            <g transform={`translate(${40 - (svgDimensions.minX ?? 0)}, ${40 - (svgDimensions.minY ?? 0)})`}>
              {/* Tables first so relationship lines draw on top (arrows stay visible, not hidden behind boxes) */}
              {tables.map((table) => {
              const pos = displayPositions[table.table_name];
              if (!pos) return null;

              return (
                <g
                  key={table.table_name}
                  onMouseDown={(e) => onTableMouseDown(e, table.table_name)}
                  style={{ cursor: draggingTable === table.table_name ? "grabbing" : "move" }}
                >
                  <ERDTable
                    table={table}
                    x={pos.x}
                    y={pos.y}
                    tableWidth={TABLE_WIDTH}
                    headerHeight={HEADER_HEIGHT}
                    rowHeight={ROW_HEIGHT}
                    expanded={expandedTables.has(table.table_name)}
                    onToggleExpand={() => toggleTableExpand(table.table_name)}
                  />
                </g>
              );
            })}

              {/* Relationship lines on top so they're never hidden behind table boxes */}
              {relationshipPaths}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ERD View Component
function ERDView({ catalogName, schemaName, onBack }: { catalogName: string; schemaName: string; onBack: () => void }) {
  const { data, isLoading, error, isFetching } = useGetSchemaERD({
    params: { catalog_name: catalogName, schema_name: schemaName },
  });
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    if (error) {
      setShowErrorModal(true);
    } else {
      setShowErrorModal(false);
    }
  }, [error]);

  // Show loading when fetching (covers initial load and refetch when switching schema)
  const showLoading = isLoading || (isFetching && !data);

  const handleCloseModal = () => {
    setShowErrorModal(false);
    onBack();
  };

  if (showLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        <span className="ml-3 text-muted-foreground">Loading ERD...</span>
      </div>
    );
  }

  return (
    <>
      <ErrorModal isOpen={showErrorModal} onClose={handleCloseModal} title="Failed to load ERD" message={error?.message || "Unable to load schema information."} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 p-4 border-b shrink-0">
          <nav className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {catalogName}
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{schemaName}</span>
          </nav>
          <span className="text-sm text-muted-foreground">{data?.data.tables.length ?? 0} tables</span>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <ERDDiagram key={`${catalogName}.${schemaName}`} tables={data?.data.tables ?? []} relationships={data?.data.relationships ?? []} />
        </div>
      </div>
    </>
  );
}

// Sidebar Navigation
function Sidebar({
  selectedCatalog,
  selectedSchema,
  onSelectCatalog,
  onSelectSchema,
  onBack,
}: {
  selectedCatalog: CatalogOut | null;
  selectedSchema: SchemaOut | null;
  onSelectCatalog: (catalog: CatalogOut) => void;
  onSelectSchema: (schema: SchemaOut) => void;
  onBack: () => void;
}) {
  const { data: catalogsData, isLoading: catalogsLoading, error: catalogsError } = useListCatalogs();
  const { data: schemasData, isLoading: schemasLoading, error: schemasError } = useListSchemas({
    params: { catalog_name: selectedCatalog?.name ?? "" },
    query: { enabled: !!selectedCatalog },
  });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (schemasError) {
      setErrorMessage(schemasError.message || "Unable to load schemas");
      setShowErrorModal(true);
    }
  }, [schemasError]);

  const handleCloseModal = () => {
    setShowErrorModal(false);
    onBack();
  };

  const catalogs = catalogsData?.data.catalogs ?? [];
  const schemas = schemasData?.data.schemas ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const filteredCatalogs = useMemo(
    () => catalogs.filter((c) => c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [catalogs, searchQuery]
  );
  const filteredSchemas = useMemo(
    () => schemas.filter((s) => s.name.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [schemas, searchQuery]
  );

  return (
    <>
      <ErrorModal isOpen={showErrorModal} onClose={handleCloseModal} title="Failed to load schemas" message={errorMessage} />

      <div className="w-64 border-r bg-card/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b">
          {selectedCatalog ? (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <DatabaseIcon className="h-4 w-4" />
              Catalogs
            </h2>
          )}
        </div>

        {/* Search */}
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={selectedCatalog ? "Filter schemas…" : "Filter catalogs…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 pt-0">
          {!selectedCatalog ? (
            // Catalog list
            catalogsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : catalogsError ? (
              <div className="p-2 text-sm text-destructive space-y-1">
                <div>Failed to load catalogs</div>
                {catalogsError instanceof ApiError &&
                  typeof catalogsError.body === "object" &&
                  catalogsError.body !== null &&
                  "detail" in catalogsError.body && (
                    <div className="text-muted-foreground font-normal text-xs mt-1">
                      {typeof (catalogsError.body as { detail: unknown }).detail === "string"
                        ? (catalogsError.body as { detail: string }).detail
                        : JSON.stringify((catalogsError.body as { detail: unknown }).detail)}
                    </div>
                  )}
              </div>
            ) : filteredCatalogs.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {searchQuery.trim() ? "No matching catalogs" : "No catalogs found"}
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredCatalogs.map((catalog) => (
                  <li
                    key={catalog.name}
                    onClick={() => {
                      setSearchQuery("");
                      onSelectCatalog(catalog);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm group"
                  >
                    <DatabaseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate flex-1">{catalog.name}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </li>
                ))}
              </ul>
            )
          ) : (
            // Schema list
            <>
              <div className="px-2 py-1 mb-2">
                <div className="text-xs text-muted-foreground">Catalog</div>
                <div className="text-sm font-medium truncate">{selectedCatalog.name}</div>
              </div>
              {schemasLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredSchemas.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  {searchQuery.trim() ? "No matching schemas" : "No schemas found"}
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredSchemas.map((schema) => (
                    <li
                      key={schema.name}
                      onClick={() => onSelectSchema(schema)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                        selectedSchema?.name === schema.name ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      }`}
                    >
                      <SchemaIcon className="h-3.5 w-3.5" />
                      <span className="truncate flex-1">{schema.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Main Index Component
function Index() {
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogOut | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<SchemaOut | null>(null);

  const handleSelectCatalog = useCallback((catalog: CatalogOut) => {
    setSelectedCatalog(catalog);
    setSelectedSchema(null);
  }, []);

  const handleSelectSchema = useCallback((schema: SchemaOut) => {
    setSelectedSchema(schema);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedSchema) {
      setSelectedSchema(null);
    } else {
      setSelectedCatalog(null);
    }
  }, [selectedSchema]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          selectedCatalog={selectedCatalog}
          selectedSchema={selectedSchema}
          onSelectCatalog={handleSelectCatalog}
          onSelectSchema={handleSelectSchema}
          onBack={handleBack}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedCatalog && !selectedSchema ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <h1 className="text-3xl font-bold mb-4">Welcome to {__APP_NAME__}</h1>
                <p className="text-muted-foreground">Select a catalog from the sidebar, then choose a schema to view its ERD diagram.</p>
              </div>
            </div>
          ) : selectedCatalog && !selectedSchema ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <h2 className="text-xl font-semibold mb-2">Select a Schema</h2>
                <p className="text-muted-foreground">Choose a schema from <span className="font-medium">{selectedCatalog.name}</span> to view its entity relationship diagram.</p>
              </div>
            </div>
          ) : selectedCatalog && selectedSchema ? (
            <ERDView
              key={`${selectedCatalog.name}.${selectedSchema.name}`}
              catalogName={selectedCatalog.name}
              schemaName={selectedSchema.name}
              onBack={handleBack}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
