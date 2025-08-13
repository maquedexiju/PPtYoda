export interface PageItem {
  id: number;
  name: string;
}

export interface SectionData {
  [sectionName: string]: PageItem[];
}

export interface PPtTemplate {
    id: number;
    name: string;
    sections?: SectionData[];
    created_at: string;
}