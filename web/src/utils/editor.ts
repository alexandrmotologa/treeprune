export function getEditorLink(
  projectRoot: string,
  filePath: string,
  line: number = 1,
  editor: "cursor" | "vscode" = "cursor"
): string {
  const cleanRoot = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");
  const cleanPath = filePath.replace(/\\/g, "/").replace(/^\//, "");
  const fullPath = `${cleanRoot}/${cleanPath}`;

  if (editor === "cursor") {
    return `cursor://file/${fullPath}:${line}:1`;
  }
  return `vscode://file/${fullPath}:${line}:1`;
}
