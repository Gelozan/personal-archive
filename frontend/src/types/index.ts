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