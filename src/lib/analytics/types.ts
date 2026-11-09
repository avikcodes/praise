export type AnalyticsPeriod = "7d" | "30d" | "90d" | "all";

export type AnalyticsSummary = {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  archivedSubmissions: number;
  approvalRate: number; // Percentage (0-100)
  formViews: number;
  formSubmissionRate: number; // Conversion rate Percentage (0-100)
  widgetViews: number;
  widgetClicks: number;
  widgetEngagementRate: number; // Click-through / engagement rate Percentage (0-100)
  averageRating: number | null;
  typeDistribution: {
    text: number;
    video: number;
    audio: number;
  };
};

export type AnalyticsDailyTrend = {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Nov 4"
  submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  formViews: number;
  widgetViews: number;
  widgetClicks: number;
};

export type FormPerformanceItem = {
  id: string;
  title: string;
  slug: string;
  projectId?: string | null;
  projectName?: string | null;
  isPublished: boolean;
  views: number;
  submissions: number;
  submissionRate: number; // Percentage (0-100)
  approvedCount: number;
};

export type WidgetPerformanceItem = {
  id: string;
  name: string;
  type: string;
  slug?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  views: number;
  clicks: number;
  engagementRate: number; // Percentage (0-100)
};

export type AnalyticsResponse = {
  period: AnalyticsPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  summary: AnalyticsSummary;
  dailyTrends: AnalyticsDailyTrend[];
  formPerformance: FormPerformanceItem[];
  widgetPerformance: WidgetPerformanceItem[];
};

