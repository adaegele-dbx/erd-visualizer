import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "@/lib/api";

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
  const TABLE_GAP_X = 80;
  const TABLE_GAP_Y = 40;
  const COLS = Math.ceil(Math.sqrt(tables.length));

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

  // Calculate table positions based on current expanded state
  const tablePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; height: number }> = {};
    let maxHeightInRow = 0;
    let currentY = 20;

    tables.forEach((table, index) => {
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
  }, [tables, getDisplayedColumns, hasHiddenColumns]);

  // Calculate SVG dimensions
  const svgDimensions = useMemo(() => {
    if (Object.keys(tablePositions).length === 0) return { width: 400, height: 300 };
    const maxX = Math.max(...Object.values(tablePositions).map((p) => p.x + TABLE_WIDTH));
    const maxY = Math.max(...Object.values(tablePositions).map((p) => p.y + p.height));
    return { width: maxX + 40, height: maxY + 40 };
  }, [tablePositions]);

  // Draw relationship lines
  const relationshipPaths = useMemo(() => {
    return relationships
      .map((rel, idx) => {
        const sourcePos = tablePositions[rel.source_table];
        const targetPos = tablePositions[rel.target_table];
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

        let startX: number, endX: number;
        let controlOffset: number;

        if (sourceRight < targetLeft) {
          startX = sourceRight;
          endX = targetLeft;
          controlOffset = (endX - startX) / 2;
        } else if (sourceLeft > targetRight) {
          startX = sourceLeft;
          endX = targetRight;
          controlOffset = (startX - endX) / 2;
        } else {
          startX = sourceRight;
          endX = targetRight;
          controlOffset = 40;
        }

        const path = `M ${startX} ${sourceY} C ${startX + controlOffset} ${sourceY}, ${endX + (sourceRight < targetLeft ? -controlOffset : controlOffset)} ${targetY}, ${endX} ${targetY}`;

        return (
          <g key={idx}>
            <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" opacity="0.6" markerEnd="url(#arrowhead)" />
          </g>
        );
      })
      .filter(Boolean);
  }, [relationships, tablePositions, tables, getDisplayedColumns]);

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No tables found in this schema</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto flex items-center justify-center bg-muted/30 rounded-lg">
      <svg width={svgDimensions.width} height={svgDimensions.height} style={{ minWidth: svgDimensions.width, minHeight: svgDimensions.height }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-primary)" opacity="0.6" />
          </marker>
        </defs>

        {/* Relationship lines */}
        {relationshipPaths}

        {/* Tables */}
        {tables.map((table) => {
          const pos = tablePositions[table.table_name];
          if (!pos) return null;

          return (
            <ERDTable
              key={table.table_name}
              table={table}
              x={pos.x}
              y={pos.y}
              tableWidth={TABLE_WIDTH}
              headerHeight={HEADER_HEIGHT}
              rowHeight={ROW_HEIGHT}
              expanded={expandedTables.has(table.table_name)}
              onToggleExpand={() => toggleTableExpand(table.table_name)}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ERD View Component
function ERDView({ catalogName, schemaName, onBack }: { catalogName: string; schemaName: string; onBack: () => void }) {
  const { data, isLoading, error } = useGetSchemaERD({
    params: { catalog_name: catalogName, schema_name: schemaName },
  });
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    if (error) {
      setShowErrorModal(true);
    }
  }, [error]);

  const handleCloseModal = () => {
    setShowErrorModal(false);
    onBack();
  };

  if (isLoading) {
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
        <div className="flex items-center gap-4 p-4 border-b">
          <h2 className="text-lg font-semibold">
            {catalogName}.{schemaName}
          </h2>
          <span className="text-sm text-muted-foreground">{data?.data.tables.length ?? 0} tables</span>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <ERDDiagram tables={data?.data.tables ?? []} relationships={data?.data.relationships ?? []} />
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {!selectedCatalog ? (
            // Catalog list
            catalogsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : catalogsError ? (
              <div className="p-2 text-sm text-destructive">Failed to load catalogs</div>
            ) : catalogs.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No catalogs found</div>
            ) : (
              <ul className="space-y-1">
                {catalogs.map((catalog) => (
                  <li
                    key={catalog.name}
                    onClick={() => onSelectCatalog(catalog)}
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
              ) : schemas.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No schemas found</div>
              ) : (
                <ul className="space-y-1">
                  {schemas.map((schema) => (
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

  const handleBackToCatalogs = useCallback(() => {
    setSelectedCatalog(null);
    setSelectedSchema(null);
  }, []);

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
          onBack={handleBackToCatalogs}
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
            <ERDView catalogName={selectedCatalog.name} schemaName={selectedSchema.name} onBack={handleBack} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
