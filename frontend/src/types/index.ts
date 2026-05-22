export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  children?: Folder[];
}

export interface Category {
  id: number;
  name: string;
  owner_id: number | null;
}

export interface Document {
  id: number;
  title: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  note: string | null;
  category_id: number | null;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Filters {
  category_id: string;
  mime_type: string;
  date_from: string;
  date_to: string;
  size_min: string;
  size_max: string;
  sort_by: string;
  sort_order: string;
}

export const EMPTY_FILTERS: Filters = {
  category_id: "",
  mime_type: "",
  date_from: "",
  date_to: "",
  size_min: "",
  size_max: "",
  sort_by: "created_at",
  sort_order: "asc",
};