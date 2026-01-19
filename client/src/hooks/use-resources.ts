import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertActivity, type InsertNotification } from "@shared/routes";

// --- Activities ---
export function useActivities() {
  return useQuery({
    queryKey: [api.activities.list.path],
    queryFn: async () => {
      const res = await fetch(api.activities.list.path);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return api.activities.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertActivity) => {
      const res = await fetch(api.activities.create.path, {
        method: api.activities.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create activity");
      return api.activities.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activities.list.path] });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.activities.delete.path, { id });
      const res = await fetch(url, { method: api.activities.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete activity");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activities.list.path] });
    },
  });
}

// --- Notifications ---
export function useNotifications() {
  return useQuery({
    queryKey: [api.notifications.list.path],
    queryFn: async () => {
      const res = await fetch(api.notifications.list.path);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return api.notifications.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertNotification) => {
      const res = await fetch(api.notifications.create.path, {
        method: api.notifications.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create notification");
      return api.notifications.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.notifications.delete.path, { id });
      const res = await fetch(url, { method: api.notifications.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete notification");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
  });
}

// --- Users / Directory ---
export function useUsers(search?: string) {
  return useQuery({
    queryKey: [api.users.list.path, search],
    queryFn: async () => {
      const url = search 
        ? `${api.users.list.path}?search=${encodeURIComponent(search)}` 
        : api.users.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

// --- Weather ---
export function useWeather() {
  return useQuery({
    queryKey: [api.weather.get.path],
    queryFn: async () => {
      const res = await fetch(api.weather.get.path);
      if (!res.ok) throw new Error("Failed to fetch weather");
      return api.weather.get.responses[200].parse(await res.json());
    },
  });
}
