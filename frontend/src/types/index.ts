export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  children?: Folder[];
}

export interface Category {
  id: number;
  name: string;
  color: string | null;
}

export interface Document {
  id: number;
  title: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
}