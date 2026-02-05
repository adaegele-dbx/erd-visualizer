import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseSuspenseQueryOptions } from "@tanstack/react-query";

export interface CatalogOut {
  comment?: string | null;
  created_at?: number | null;
  name: string;
  owner?: string | null;
}

export interface CatalogsListOut {
  catalogs: CatalogOut[];
}

export interface ColumnInfo {
  column_name: string;
  constraint_name?: string | null;
  constraint_type?: string | null;
  data_type: string;
  is_nullable: string;
  ordinal_position: number;
  referenced_column_name?: string | null;
  referenced_table_name?: string | null;
  referenced_table_schema?: string | null;
}

export interface ComplexValue {
  display?: string | null;
  primary?: boolean | null;
  ref?: string | null;
  type?: string | null;
  value?: string | null;
}

export interface ERDDataOut {
  catalog_name: string;
  relationships: RelationshipInfo[];
  schema_name: string;
  tables: TableInfo[];
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface Name {
  family_name?: string | null;
  given_name?: string | null;
}

export interface RelationshipInfo {
  constraint_name: string;
  source_column: string;
  source_table: string;
  target_column: string;
  target_table: string;
  target_table_schema: string;
}

export interface SchemaOut {
  catalog_name: string;
  comment?: string | null;
  created_at?: number | null;
  name: string;
  owner?: string | null;
}

export interface SchemasListOut {
  schemas: SchemaOut[];
}

export interface TableInfo {
  columns: ColumnInfo[];
  table_name: string;
}

export interface User {
  active?: boolean | null;
  display_name?: string | null;
  emails?: ComplexValue[] | null;
  entitlements?: ComplexValue[] | null;
  external_id?: string | null;
  groups?: ComplexValue[] | null;
  id?: string | null;
  name?: Name | null;
  roles?: ComplexValue[] | null;
  schemas?: UserSchema[] | null;
  user_name?: string | null;
}

export const UserSchema = {
  "urn:ietf:params:scim:schemas:core:2.0:User": "urn:ietf:params:scim:schemas:core:2.0:User",
  "urn:ietf:params:scim:schemas:extension:workspace:2.0:User": "urn:ietf:params:scim:schemas:extension:workspace:2.0:User",
} as const;

export type UserSchema = (typeof UserSchema)[keyof typeof UserSchema];

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface VersionOut {
  version: string;
}

export interface ListCatalogsParams {
  "X-Forwarded-Access-Token"?: string | null;
}

export interface ListSchemasParams {
  catalog_name: string;
  "X-Forwarded-Access-Token"?: string | null;
}

export interface GetSchemaERDParams {
  catalog_name: string;
  schema_name: string;
  "X-Forwarded-Access-Token"?: string | null;
}

export interface CurrentUserParams {
  "X-Forwarded-Access-Token"?: string | null;
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export const listCatalogs = async (params?: ListCatalogsParams, options?: RequestInit): Promise<{ data: CatalogsListOut }> => {
  const res = await fetch("/api/catalogs", { ...options, method: "GET", headers: { ...(params?.["X-Forwarded-Access-Token"] != null && { "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"] }), ...options?.headers } });
  if (!res.ok) {
    const body = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    throw new ApiError(res.status, res.statusText, parsed);
  }
  return { data: await res.json() };
};

export const listCatalogsKey = (params?: ListCatalogsParams) => {
  return ["/api/catalogs", params] as const;
};

export function useListCatalogs<TData = { data: CatalogsListOut }>(options?: { params?: ListCatalogsParams; query?: Omit<UseQueryOptions<{ data: CatalogsListOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useQuery({ queryKey: listCatalogsKey(options?.params), queryFn: () => listCatalogs(options?.params), ...options?.query });
}

export function useListCatalogsSuspense<TData = { data: CatalogsListOut }>(options?: { params?: ListCatalogsParams; query?: Omit<UseSuspenseQueryOptions<{ data: CatalogsListOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useSuspenseQuery({ queryKey: listCatalogsKey(options?.params), queryFn: () => listCatalogs(options?.params), ...options?.query });
}

export const listSchemas = async (params: ListSchemasParams, options?: RequestInit): Promise<{ data: SchemasListOut }> => {
  const res = await fetch(`/api/catalogs/${params.catalog_name}/schemas`, { ...options, method: "GET", headers: { ...(params?.["X-Forwarded-Access-Token"] != null && { "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"] }), ...options?.headers } });
  if (!res.ok) {
    const body = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    throw new ApiError(res.status, res.statusText, parsed);
  }
  return { data: await res.json() };
};

export const listSchemasKey = (params?: ListSchemasParams) => {
  return ["/api/catalogs/{catalog_name}/schemas", params] as const;
};

export function useListSchemas<TData = { data: SchemasListOut }>(options: { params: ListSchemasParams; query?: Omit<UseQueryOptions<{ data: SchemasListOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useQuery({ queryKey: listSchemasKey(options.params), queryFn: () => listSchemas(options.params), ...options?.query });
}

export function useListSchemasSuspense<TData = { data: SchemasListOut }>(options: { params: ListSchemasParams; query?: Omit<UseSuspenseQueryOptions<{ data: SchemasListOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useSuspenseQuery({ queryKey: listSchemasKey(options.params), queryFn: () => listSchemas(options.params), ...options?.query });
}

export const getSchemaERD = async (params: GetSchemaERDParams, options?: RequestInit): Promise<{ data: ERDDataOut }> => {
  const res = await fetch(`/api/catalogs/${params.catalog_name}/schemas/${params.schema_name}/erd`, { ...options, method: "GET", headers: { ...(params?.["X-Forwarded-Access-Token"] != null && { "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"] }), ...options?.headers } });
  if (!res.ok) {
    const body = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    throw new ApiError(res.status, res.statusText, parsed);
  }
  return { data: await res.json() };
};

export const getSchemaERDKey = (params?: GetSchemaERDParams) => {
  return ["/api/catalogs/{catalog_name}/schemas/{schema_name}/erd", params] as const;
};

export function useGetSchemaERD<TData = { data: ERDDataOut }>(options: { params: GetSchemaERDParams; query?: Omit<UseQueryOptions<{ data: ERDDataOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useQuery({ queryKey: getSchemaERDKey(options.params), queryFn: () => getSchemaERD(options.params), ...options?.query });
}

export function useGetSchemaERDSuspense<TData = { data: ERDDataOut }>(options: { params: GetSchemaERDParams; query?: Omit<UseSuspenseQueryOptions<{ data: ERDDataOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useSuspenseQuery({ queryKey: getSchemaERDKey(options.params), queryFn: () => getSchemaERD(options.params), ...options?.query });
}

export const currentUser = async (params?: CurrentUserParams, options?: RequestInit): Promise<{ data: User }> => {
  const res = await fetch("/api/current-user", { ...options, method: "GET", headers: { ...(params?.["X-Forwarded-Access-Token"] != null && { "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"] }), ...options?.headers } });
  if (!res.ok) {
    const body = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    throw new ApiError(res.status, res.statusText, parsed);
  }
  return { data: await res.json() };
};

export const currentUserKey = (params?: CurrentUserParams) => {
  return ["/api/current-user", params] as const;
};

export function useCurrentUser<TData = { data: User }>(options?: { params?: CurrentUserParams; query?: Omit<UseQueryOptions<{ data: User }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useQuery({ queryKey: currentUserKey(options?.params), queryFn: () => currentUser(options?.params), ...options?.query });
}

export function useCurrentUserSuspense<TData = { data: User }>(options?: { params?: CurrentUserParams; query?: Omit<UseSuspenseQueryOptions<{ data: User }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useSuspenseQuery({ queryKey: currentUserKey(options?.params), queryFn: () => currentUser(options?.params), ...options?.query });
}

export const version = async (options?: RequestInit): Promise<{ data: VersionOut }> => {
  const res = await fetch("/api/version", { ...options, method: "GET" });
  if (!res.ok) {
    const body = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    throw new ApiError(res.status, res.statusText, parsed);
  }
  return { data: await res.json() };
};

export const versionKey = () => {
  return ["/api/version"] as const;
};

export function useVersion<TData = { data: VersionOut }>(options?: { query?: Omit<UseQueryOptions<{ data: VersionOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useQuery({ queryKey: versionKey(), queryFn: () => version(), ...options?.query });
}

export function useVersionSuspense<TData = { data: VersionOut }>(options?: { query?: Omit<UseSuspenseQueryOptions<{ data: VersionOut }, ApiError, TData>, "queryKey" | "queryFn"> }) {
  return useSuspenseQuery({ queryKey: versionKey(), queryFn: () => version(), ...options?.query });
}

