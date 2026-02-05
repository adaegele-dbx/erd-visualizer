from pydantic import BaseModel
from .. import __version__


class VersionOut(BaseModel):
    version: str

    @classmethod
    def from_metadata(cls):
        return cls(version=__version__)


class CatalogOut(BaseModel):
    name: str
    comment: str | None = None
    owner: str | None = None
    created_at: int | None = None


class CatalogsListOut(BaseModel):
    catalogs: list[CatalogOut]


class SchemaOut(BaseModel):
    name: str
    catalog_name: str
    comment: str | None = None
    owner: str | None = None
    created_at: int | None = None


class SchemasListOut(BaseModel):
    schemas: list[SchemaOut]


class ColumnInfo(BaseModel):
    column_name: str
    ordinal_position: int
    data_type: str
    is_nullable: str
    constraint_type: str | None = None
    constraint_name: str | None = None
    referenced_table_schema: str | None = None
    referenced_table_name: str | None = None
    referenced_column_name: str | None = None


class TableInfo(BaseModel):
    table_name: str
    columns: list[ColumnInfo]


class RelationshipInfo(BaseModel):
    source_table: str
    source_column: str
    target_table_schema: str
    target_table: str
    target_column: str
    constraint_name: str


class ERDDataOut(BaseModel):
    catalog_name: str
    schema_name: str
    tables: list[TableInfo]
    relationships: list[RelationshipInfo]
