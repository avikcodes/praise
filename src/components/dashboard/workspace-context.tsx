"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  counts?: {
    projects: number;
    testimonials: number;
    forms: number;
    widgets: number;
    members: number;
  };
  createdAt?: string;
};

export type BrandItem = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  website?: string | null;
  color?: string | null;
  projectsCount?: number;
  projects?: { id: string; name: string }[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectItem = {
  id: string;
  workspaceId: string;
  brandId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  logoUrl?: string | null;
  brand?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    logoUrl?: string | null;
  } | null;
  formsCount: number;
  widgetsCount: number;
  testimonialsCount: number;
  createdAt?: string;
  updatedAt?: string;
};

type WorkspaceContextType = {
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  isLoadingWorkspaces: boolean;
  setActiveWorkspaceId: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (
    name: string,
    slug?: string,
  ) => Promise<{ success: boolean; error?: string; workspace?: WorkspaceItem }>;
  updateWorkspace: (
    id: string,
    data: { name?: string; slug?: string },
  ) => Promise<{ success: boolean; error?: string }>;
  deleteWorkspace: (
    id: string,
  ) => Promise<{ success: boolean; error?: string }>;

  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  isLoadingProjects: boolean;
  setActiveProjectId: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  createProject: (data: {
    name: string;
    slug?: string;
    description?: string;
    color?: string;
    logoUrl?: string;
    brandId?: string | null;
  }) => Promise<{ success: boolean; error?: string; project?: ProjectItem }>;
  updateProject: (
    projectId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      color?: string;
      logoUrl?: string;
      brandId?: string | null;
    },
  ) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (
    projectId: string,
  ) => Promise<{ success: boolean; error?: string }>;

  brands: BrandItem[];
  isLoadingBrands: boolean;
  refreshBrands: () => Promise<void>;
  createBrand: (data: {
    name: string;
    slug?: string;
    logoUrl?: string;
    website?: string;
    color?: string;
  }) => Promise<{ success: boolean; error?: string; brand?: BrandItem }>;
  updateBrand: (
    brandId: string,
    data: {
      name?: string;
      slug?: string;
      logoUrl?: string;
      website?: string;
      color?: string;
    },
  ) => Promise<{ success: boolean; error?: string }>;
  deleteBrand: (
    brandId: string,
  ) => Promise<{ success: boolean; error?: string }>;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

const LOCAL_STORAGE_WS_KEY = "praise_active_workspace_id";
const LOCAL_STORAGE_PROJ_PREFIX = "praise_active_project_id_";

// Sane default if not logged in or during SSR
const defaultFallbackWorkspace: WorkspaceItem = {
  id: "ws-default",
  name: "Default Workspace",
  slug: "default",
  role: "OWNER",
  counts: {
    projects: 1,
    testimonials: 0,
    forms: 1,
    widgets: 1,
    members: 1,
  },
};

const defaultFallbackProject: ProjectItem = {
  id: "proj-default",
  workspaceId: "ws-default",
  name: "Primary Web Application",
  slug: "web-app",
  description: "Main marketing and web app testimonial collection.",
  color: "#7049D8",
  formsCount: 1,
  widgetsCount: 1,
  testimonialsCount: 0,
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([
    defaultFallbackWorkspace,
  ]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] =
    useState<string>("ws-default");
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);

  const [projects, setProjects] = useState<ProjectItem[]>([
    defaultFallbackProject,
  ]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    "proj-default",
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_WS_KEY, id);
      } catch {
        // ignore
      }
    }
  }, []);

  const setActiveProjectId = useCallback(
    (id: string | null) => {
      setActiveProjectIdState(id);
      if (typeof window !== "undefined" && activeWorkspaceId) {
        try {
          if (id) {
            localStorage.setItem(
              `${LOCAL_STORAGE_PROJ_PREFIX}${activeWorkspaceId}`,
              id,
            );
          } else {
            localStorage.removeItem(
              `${LOCAL_STORAGE_PROJ_PREFIX}${activeWorkspaceId}`,
            );
          }
        } catch {
          // ignore
        }
      }
    },
    [activeWorkspaceId],
  );

  // Manual refresh of workspaces
  const refreshWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
          setWorkspaces(data.workspaces);
          const savedId =
            typeof window !== "undefined"
              ? localStorage.getItem(LOCAL_STORAGE_WS_KEY)
              : null;
          const matched = data.workspaces.find(
            (w: WorkspaceItem) => w.id === savedId,
          );
          if (matched) {
            setActiveWorkspaceIdState(matched.id);
          } else if (
            !data.workspaces.some((w: WorkspaceItem) => w.id === activeWorkspaceId)
          ) {
            setActiveWorkspaceIdState(data.workspaces[0].id);
          }
        }
      }
    } catch {
      // Use fallback
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [activeWorkspaceId]);

  // Manual refresh of projects for current active workspace
  const refreshProjects = useCallback(async () => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return;
    }
    setIsLoadingProjects(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/projects`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.projects)) {
          setProjects(data.projects);
          const savedProjId =
            typeof window !== "undefined"
              ? localStorage.getItem(
                  `${LOCAL_STORAGE_PROJ_PREFIX}${activeWorkspaceId}`,
                )
              : null;
          const matched = data.projects.find(
            (p: ProjectItem) => p.id === savedProjId,
          );
          if (matched) {
            setActiveProjectIdState(matched.id);
          } else if (data.projects.length > 0) {
            setActiveProjectIdState(data.projects[0].id);
          } else {
            setActiveProjectIdState(null);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingProjects(false);
    }
  }, [activeWorkspaceId]);

  // Manual refresh of brands for current active workspace
  const refreshBrands = useCallback(async () => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return;
    }
    setIsLoadingBrands(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/brands`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.brands)) {
          setBrands(data.brands);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingBrands(false);
    }
  }, [activeWorkspaceId]);

  // Initial load of workspaces
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetch("/api/workspaces");
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
            setWorkspaces(data.workspaces);
            const savedId =
              typeof window !== "undefined"
                ? localStorage.getItem(LOCAL_STORAGE_WS_KEY)
                : null;
            const matched = data.workspaces.find(
              (w: WorkspaceItem) => w.id === savedId,
            );
            setActiveWorkspaceIdState(matched ? matched.id : data.workspaces[0].id);
          }
        }
      } catch {
        // use fallback
      } finally {
        if (isMounted) {
          setIsLoadingWorkspaces(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync projects and brands when activeWorkspaceId changes
  useEffect(() => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return;
    }
    let isMounted = true;
    async function loadWorkspaceChildren() {
      try {
        const [projRes, brandRes] = await Promise.all([
          fetch(`/api/workspaces/${activeWorkspaceId}/projects`),
          fetch(`/api/workspaces/${activeWorkspaceId}/brands`),
        ]);
        if (!isMounted) return;
        if (projRes.ok) {
          const projData = await projRes.json();
          if (Array.isArray(projData.projects)) {
            setProjects(projData.projects);
            const savedProjId =
              typeof window !== "undefined"
                ? localStorage.getItem(
                    `${LOCAL_STORAGE_PROJ_PREFIX}${activeWorkspaceId}`,
                  )
                : null;
            const matched = projData.projects.find(
              (p: ProjectItem) => p.id === savedProjId,
            );
            setActiveProjectIdState(
              matched ? matched.id : (projData.projects[0]?.id || null),
            );
          }
        }
        if (brandRes.ok) {
          const brandData = await brandRes.json();
          if (Array.isArray(brandData.brands)) {
            setBrands(brandData.brands);
          }
        }
      } catch {
        // ignore
      }
    }
    loadWorkspaceChildren();
    return () => {
      isMounted = false;
    };
  }, [activeWorkspaceId]);

  // Workspace Actions
  const createWorkspace = async (name: string, slug?: string) => {
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Failed to create workspace",
        };
      }
      await refreshWorkspaces();
      if (data.workspace?.id) {
        setActiveWorkspaceId(data.workspace.id);
      }
      return { success: true, workspace: data.workspace };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const updateWorkspace = async (
    id: string,
    data: { name?: string; slug?: string },
  ) => {
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to update workspace",
        };
      }
      await refreshWorkspaces();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to delete workspace",
        };
      }
      const remaining = workspaces.filter((w) => w.id !== id);
      if (remaining.length > 0) {
        setActiveWorkspaceId(remaining[0].id);
      }
      await refreshWorkspaces();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  // Project Actions
  const createProject = async (data: {
    name: string;
    slug?: string;
    description?: string;
    color?: string;
    logoUrl?: string;
    brandId?: string | null;
  }) => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return { success: false, error: "No active workspace selected" };
    }
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to create project",
        };
      }
      await refreshProjects();
      if (resData.project?.id) {
        setActiveProjectId(resData.project.id);
      }
      return { success: true, project: resData.project };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const updateProject = async (
    projectId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      color?: string;
      logoUrl?: string;
      brandId?: string | null;
    },
  ) => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return { success: false, error: "No active workspace selected" };
    }
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspaceId}/projects/${projectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to update project",
        };
      }
      await refreshProjects();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return { success: false, error: "No active workspace selected" };
    }
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspaceId}/projects/${projectId}`,
        {
          method: "DELETE",
        },
      );
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to delete project",
        };
      }
      if (activeProjectId === projectId) {
        const remaining = projects.filter((p) => p.id !== projectId);
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
      }
      await refreshProjects();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  // Brand Actions
  const createBrand = async (data: {
    name: string;
    slug?: string;
    logoUrl?: string;
    website?: string;
    color?: string;
  }) => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return { success: false, error: "No active workspace selected" };
    }
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to create brand",
        };
      }
      await refreshBrands();
      return { success: true, brand: resData.brand };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const updateBrand = async (
    brandId: string,
    data: {
      name?: string;
      slug?: string;
      logoUrl?: string;
      website?: string;
      color?: string;
    },
  ) => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return { success: false, error: "No active workspace selected" };
    }
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspaceId}/brands/${brandId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to update brand",
        };
      }
      await refreshBrands();
      await refreshProjects();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const deleteBrand = async (brandId: string) => {
    if (!activeWorkspaceId || activeWorkspaceId.startsWith("ws-default")) {
      return { success: false, error: "No active workspace selected" };
    }
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspaceId}/brands/${brandId}`,
        {
          method: "DELETE",
        },
      );
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed to delete brand",
        };
      }
      await refreshBrands();
      await refreshProjects();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoadingWorkspaces,
        setActiveWorkspaceId,
        refreshWorkspaces,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,

        projects,
        activeProject,
        isLoadingProjects,
        setActiveProjectId,
        refreshProjects,
        createProject,
        updateProject,
        deleteProject,

        brands,
        isLoadingBrands,
        refreshBrands,
        createBrand,
        updateBrand,
        deleteBrand,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
