import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const exec = promisify(execFile);

export interface BuildVerificationResult {
  success: boolean;
  compiler: string;
  output?: string;
  error?: string;
}

export async function verifyBuild(
  projectRoot: string,
  modifiedFiles: string[]
): Promise<BuildVerificationResult> {
  // 1. Check TypeScript project
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  const hasTsConfig = await fs.stat(tsconfigPath).then(() => true).catch(() => false);

  if (hasTsConfig) {
    try {
      const { stdout, stderr } = await exec("npx", ["tsc", "--noEmit"], {
        cwd: projectRoot,
        shell: true,
      });
      return { success: true, compiler: "tsc", output: stdout || stderr };
    } catch (err: any) {
      return {
        success: false,
        compiler: "tsc",
        error: err.stdout || err.stderr || err.message,
      };
    }
  }

  // 2. Check Go project
  const goModPath = path.join(projectRoot, "go.mod");
  const hasGoMod = await fs.stat(goModPath).then(() => true).catch(() => false);

  if (hasGoMod) {
    try {
      const { stdout, stderr } = await exec("go", ["vet", "./..."], {
        cwd: projectRoot,
        shell: true,
      });
      return { success: true, compiler: "go vet", output: stdout || stderr };
    } catch (err: any) {
      return {
        success: false,
        compiler: "go vet",
        error: err.stdout || err.stderr || err.message,
      };
    }
  }

  // 3. Check Python files
  const pythonFiles = modifiedFiles.filter((f) => f.endsWith(".py"));
  if (pythonFiles.length > 0) {
    for (const pyFile of pythonFiles) {
      const fullPyPath = path.join(projectRoot, pyFile);
      try {
        await exec("python", ["-m", "py_compile", fullPyPath], {
          cwd: projectRoot,
          shell: true,
        });
      } catch (err: any) {
        return {
          success: false,
          compiler: "python",
          error: `Syntax error in ${pyFile}: ${err.stderr || err.message}`,
        };
      }
    }
    return { success: true, compiler: "python py_compile" };
  }

  // No specific compiler detected
  return { success: true, compiler: "none" };
}
