import { formatData } from "./utils/active_helper";

export async function fetchUsers() {
  const res = await fetch("/api/users");
  const json = await res.json();
  return formatData(json);
}

export async function createUser() {
  return fetch("/api/users", { method: "POST" });
}
