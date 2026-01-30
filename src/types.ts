export type TechCategory = string;

export type ResourceType = '文章' | '视频' | '题单' | '项目' | '课程' | '书籍' | '工具';

export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  created_at?: string;
}

export interface PlanItem {
  id: number;
  date: string; // YYYY-MM-DD
  title: string;
  category: TechCategory;
  minutes: number;
  done: boolean;
  notes?: string | null;
  public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PublicPlanItem extends PlanItem {
  owner: string;
}

export interface ResourceItem {
  id: number;
  title: string;
  category: TechCategory;
  type: ResourceType;
  url: string;
  summary: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}
