import Constants from "expo-constants";
import { File as ExpoFile } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { LessonPlanCore, UserProfile } from "./types";

/**
 * Everything here talks to OUR OWN backend (see /server), never directly to
 * MongoDB or the AI provider. The mobile app never holds a database
 * connection string or an AI API key — see /server/.env.example.
 */

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://localhost:5000";
const SESSION_KEY = "smart-lesson-planner-session";
let sessionToken: string | null | undefined;

export async function getSessionToken(): Promise<string | null> {
  if (sessionToken !== undefined) return sessionToken;
  if (Platform.OS === "web") {
    sessionToken =
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(SESSION_KEY);
  } else {
    sessionToken = await SecureStore.getItemAsync(SESSION_KEY);
  }
  return sessionToken;
}

export async function setSessionToken(token: string): Promise<void> {
  sessionToken = token;
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(SESSION_KEY, token);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, token);
  }
}

export async function clearSessionToken(): Promise<void> {
  sessionToken = null;
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined")
      localStorage.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(await authHeader()),
    ...(options.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      (data as { error?: string }).error || `Server error (${res.status})`,
    ) as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return data;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  expiresAt: string;
}

export async function registerAccount(
  fullName: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return (await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password }),
  })) as AuthResponse;
}

export async function loginAccount(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return (await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })) as AuthResponse;
}

export async function fetchCurrentAccount(): Promise<UserProfile> {
  const data = (await apiFetch("/api/auth/me")) as { user: UserProfile };
  return data.user;
}

export async function logoutAccount(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}

/** Module 5 (cloud backup on top of the local SQLite copy) — best-effort. */
export async function syncLessonPlanToCloud(
  plan: LessonPlanCore,
): Promise<void> {
  await apiFetch("/api/lesson-plans", {
    method: "POST",
    body: JSON.stringify(plan),
  });
}

export interface ManagedUser extends UserProfile {
  role: "user" | "admin";
  createdAt: string;
}

export async function fetchAdminUsers(): Promise<ManagedUser[]> {
  const data = (await apiFetch("/api/users/admin")) as { users: ManagedUser[] };
  return data.users;
}

export async function setUserRole(
  uid: string,
  role: ManagedUser["role"],
): Promise<ManagedUser> {
  const data = (await apiFetch(
    `/api/users/admin/${encodeURIComponent(uid)}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  )) as { user: ManagedUser };
  return data.user;
}

export async function fetchCloudLessonPlans(): Promise<LessonPlanCore[]> {
  const data = await apiFetch("/api/lesson-plans");
  return data as LessonPlanCore[];
}

export async function deleteCloudLessonPlan(id: string): Promise<void> {
  await apiFetch(`/api/lesson-plans/${id}`, { method: "DELETE" });
}

export async function archiveLessonPlanPdf(
  planId: string,
  fileUri: string,
  fileName: string,
): Promise<void> {
  const pdf =
    Platform.OS === "web"
      ? await fetch(fileUri).then((response) => {
          if (!response.ok) throw new Error("Could not read the generated PDF.");
          return response.blob();
        })
      : new ExpoFile(fileUri);
  const form = new FormData();
  form.append("file", pdf, fileName);
  await apiFetch(
    `/api/files/lesson-plans/${encodeURIComponent(planId)}/pdf`,
    { method: "POST", body: form },
  );
}

export interface AiDraftRequest {
  planType: LessonPlanCore["planType"];
  gradeLevel: string;
  subject: string;
  topic: string;
  learningCompetencies: string;
  objectives: string[];
  activityTitles: string[];
}

export interface AiDraftResponse {
  subjectMatter: string;
  learningResources: string;
  procedure: string;
  assessment: string;
  assignment: string;
  additionalNotes: string;
  ilaw?: {
    contentStandard: string;
    performanceStandard: string;
    preLesson: string;
    flow: string;
    integration: string;
    extendedLearning: string;
  };
}

/** Calls our backend, which calls the AI provider — the API key never leaves the server. */
export async function generateLessonDraft(
  payload: AiDraftRequest,
): Promise<AiDraftResponse> {
  const data = await apiFetch("/api/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data as AiDraftResponse;
}

export async function extractCompetenciesFromPdf(
  file: File | ExpoFile,
  fileName: string,
  gradeLevel: string,
  subject: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", file, fileName);
  form.append("gradeLevel", gradeLevel);
  form.append("subject", subject);
  const data = await apiFetch("/api/files/extract-competencies", {
    method: "POST",
    body: form,
  }) as { learningCompetencies: string };
  return data.learningCompetencies;
}

export { API_URL };
