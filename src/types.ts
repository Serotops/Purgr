export interface InstalledApp {
  name: string;
  version: string;
  publisher: string;
  install_location: string;
  install_date: string;
  estimated_size_kb: number;
  uninstall_string: string;
  quiet_uninstall_string: string;
  registry_key: string;
  is_orphan: boolean;
  icon_path: string;
}

export type FilterStatus = "all" | "installed" | "orphan";
export type SortField = "name" | "publisher" | "size" | "status";
export type SortDirection = "asc" | "desc";
