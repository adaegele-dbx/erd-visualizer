from collections import defaultdict
from typing import Annotated

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.iam import User as UserOut
from databricks.sdk.service.sql import StatementState
from fastapi import APIRouter, Depends, HTTPException

from .._metadata import api_prefix
from .dependencies import get_obo_ws
from .models import (
    CatalogOut,
    CatalogsListOut,
    ColumnInfo,
    ERDDataOut,
    RelationshipInfo,
    SchemaOut,
    SchemasListOut,
    TableInfo,
    VersionOut,
)

api = APIRouter(prefix=api_prefix)


def _execute_sql(obo_ws: WorkspaceClient, query: str) -> list[list[str]]:
    """Helper function to execute SQL and return results."""
    # Get a warehouse to execute the query
    warehouses = list(obo_ws.warehouses.list())
    if not warehouses:
        raise HTTPException(
            status_code=400,
            detail="No SQL warehouse available to execute the query"
        )
    
    warehouse_id = warehouses[0].id
    if not warehouse_id:
        raise HTTPException(
            status_code=400,
            detail="SQL warehouse has no valid ID"
        )
    
    # Execute the query
    statement = obo_ws.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=query,
        wait_timeout="30s",
    )
    
    if not statement.status or statement.status.state != StatementState.SUCCEEDED:
        error_detail = statement.status.error if statement.status else "Unknown error"
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {error_detail}"
        )
    
    if statement.result and statement.result.data_array:
        return statement.result.data_array
    return []


@api.get("/version", response_model=VersionOut, operation_id="version")
async def version():
    return VersionOut.from_metadata()


@api.get("/current-user", response_model=UserOut, operation_id="currentUser")
def me(obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)]):
    return obo_ws.current_user.me()


@api.get("/catalogs", response_model=CatalogsListOut, operation_id="listCatalogs")
def list_catalogs(obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)]):
    """List all Unity Catalog catalogs accessible to the current user."""
    query = """
    SELECT catalog_name, comment, catalog_owner
    FROM system.information_schema.catalogs
    ORDER BY catalog_name
    """
    
    rows = _execute_sql(obo_ws, query)
    
    return CatalogsListOut(
        catalogs=[
            CatalogOut(
                name=row[0],
                comment=row[1],
                owner=row[2],
                created_at=None,
            )
            for row in rows
            if row[0] is not None
        ]
    )


@api.get("/catalogs/{catalog_name}/schemas", response_model=SchemasListOut, operation_id="listSchemas")
def list_schemas(catalog_name: str, obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)]):
    """List all schemas within a catalog accessible to the current user."""
    query = f"""
    SELECT schema_name, catalog_name, comment, schema_owner
    FROM {catalog_name}.information_schema.schemata
    ORDER BY schema_name
    """
    
    rows = _execute_sql(obo_ws, query)
    
    return SchemasListOut(
        schemas=[
            SchemaOut(
                name=row[0],
                catalog_name=row[1] or catalog_name,
                comment=row[2],
                owner=row[3],
                created_at=None,
            )
            for row in rows
            if row[0] is not None
        ]
    )


@api.get("/catalogs/{catalog_name}/schemas/{schema_name}/erd", response_model=ERDDataOut, operation_id="getSchemaERD")
def get_schema_erd(
    catalog_name: str,
    schema_name: str,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
):
    """Get ERD data (tables, columns, relationships) for a schema."""
    
    # SQL query to get table structure and relationships
    query = f"""
    SELECT 
      c.table_catalog,
      c.table_schema,
      c.table_name,
      c.column_name,
      c.ordinal_position,
      c.data_type,
      c.is_nullable,
      tc.constraint_type,
      tc.constraint_name,
      kcu_ref.table_schema as referenced_table_schema,
      kcu_ref.table_name as referenced_table_name,
      kcu_ref.column_name as referenced_column_name
    FROM {catalog_name}.information_schema.columns c
    LEFT JOIN {catalog_name}.information_schema.key_column_usage kcu
      ON c.table_catalog = kcu.table_catalog
      AND c.table_schema = kcu.table_schema
      AND c.table_name = kcu.table_name
      AND c.column_name = kcu.column_name
    LEFT JOIN {catalog_name}.information_schema.table_constraints tc
      ON kcu.constraint_catalog = tc.constraint_catalog
      AND kcu.constraint_schema = tc.constraint_schema
      AND kcu.constraint_name = tc.constraint_name
    LEFT JOIN {catalog_name}.information_schema.referential_constraints rc
      ON kcu.constraint_catalog = rc.constraint_catalog
      AND kcu.constraint_schema = rc.constraint_schema
      AND kcu.constraint_name = rc.constraint_name
    LEFT JOIN {catalog_name}.information_schema.key_column_usage kcu_ref
      ON rc.unique_constraint_catalog = kcu_ref.constraint_catalog
      AND rc.unique_constraint_schema = kcu_ref.constraint_schema
      AND rc.unique_constraint_name = kcu_ref.constraint_name
    WHERE c.table_schema = '{schema_name}'
    ORDER BY c.table_name, c.ordinal_position
    """
    
    rows = _execute_sql(obo_ws, query)
    
    # Process results
    tables_dict: dict[str, list[ColumnInfo]] = defaultdict(list)
    relationships: list[RelationshipInfo] = []
    seen_relationships: set[str] = set()
    
    for row in rows:
        table_name = row[2]
        column_name = row[3]
        ordinal_position = int(row[4]) if row[4] else 0
        data_type = row[5]
        is_nullable = row[6]
        constraint_type = row[7]
        constraint_name = row[8]
        ref_schema = row[9]
        ref_table = row[10]
        ref_column = row[11]
        
        # Add column info
        col_info = ColumnInfo(
            column_name=column_name,
            ordinal_position=ordinal_position,
            data_type=data_type,
            is_nullable=is_nullable,
            constraint_type=constraint_type,
            constraint_name=constraint_name,
            referenced_table_schema=ref_schema,
            referenced_table_name=ref_table,
            referenced_column_name=ref_column,
        )
        
        # Avoid duplicate columns (can happen with multiple constraints)
        existing_cols = [c.column_name for c in tables_dict[table_name]]
        if column_name not in existing_cols:
            tables_dict[table_name].append(col_info)
        
        # Track relationships (foreign keys)
        if constraint_type == "FOREIGN KEY" and ref_table and constraint_name:
            rel_key = f"{table_name}.{column_name}->{ref_table}.{ref_column}"
            if rel_key not in seen_relationships:
                seen_relationships.add(rel_key)
                relationships.append(
                    RelationshipInfo(
                        source_table=table_name,
                        source_column=column_name,
                        target_table_schema=ref_schema or schema_name,
                        target_table=ref_table,
                        target_column=ref_column,
                        constraint_name=constraint_name,
                    )
                )
    
    # Build table list
    tables = [
        TableInfo(table_name=name, columns=sorted(cols, key=lambda c: c.ordinal_position))
        for name, cols in tables_dict.items()
    ]
    
    return ERDDataOut(
        catalog_name=catalog_name,
        schema_name=schema_name,
        tables=tables,
        relationships=relationships,
    )
