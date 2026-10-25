/** Admission for planner refresh events; paths are relative to the owned vault. */
export function isTaskSourcePath(path: string, configDir: string): boolean {
  const directory = configDir.replace(/\/+$/u, "");
  return (
    path.endsWith(".md") &&
    path !== directory &&
    !path.startsWith(`${directory}/`)
  );
}
