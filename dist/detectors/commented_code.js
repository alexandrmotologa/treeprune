import fs from "node:fs/promises";
import path from "node:path";
const CODE_KEYWORDS_REGEX = /\b(function|const|let|var|class|interface|type|return|import|export|if|else|switch|case|async|await)\b|[{};]/;
export async function detectCommentedCode(projectRoot, parsedFiles) {
    const blocks = [];
    for (const file of parsedFiles) {
        const fullPath = path.join(projectRoot, file.filePath);
        let code;
        try {
            code = await fs.readFile(fullPath, "utf8");
        }
        catch {
            continue;
        }
        const lines = code.split("\n");
        let currentBlockStart = null;
        let consecutiveCommentLines = [];
        const flushBlock = (endLine) => {
            if (currentBlockStart !== null && consecutiveCommentLines.length >= 4) {
                // Check if the lines look like actual code rather than prose documentation
                const codeLikeLines = consecutiveCommentLines.filter((l) => CODE_KEYWORDS_REGEX.test(l));
                // If >= 50% of the lines contain code keywords, it's commented-out code!
                if (codeLikeLines.length >= Math.ceil(consecutiveCommentLines.length * 0.4)) {
                    blocks.push({
                        id: `${file.filePath}:${currentBlockStart}-${endLine}`,
                        filePath: file.filePath,
                        startLine: currentBlockStart,
                        endLine,
                        lineCount: consecutiveCommentLines.length,
                        snippet: consecutiveCommentLines.slice(0, 5).join("\n"),
                    });
                }
            }
            currentBlockStart = null;
            consecutiveCommentLines = [];
        };
        let inBlockComment = false;
        let blockCommentStart = 1;
        let blockCommentLines = [];
        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const raw = lines[i];
            const trimmed = raw.trim();
            // Multi-line comment start
            if (trimmed.startsWith("/*") || inBlockComment) {
                if (!inBlockComment) {
                    flushBlock(i);
                    inBlockComment = true;
                    blockCommentStart = lineNum;
                    blockCommentLines = [];
                }
                const clean = trimmed.replace(/^\/\*+/, "").replace(/\*+\/$/, "").trim();
                if (clean)
                    blockCommentLines.push(clean);
                if (trimmed.includes("*/")) {
                    inBlockComment = false;
                    if (blockCommentLines.length >= 4) {
                        const codeLike = blockCommentLines.filter((l) => CODE_KEYWORDS_REGEX.test(l));
                        if (codeLike.length >= Math.ceil(blockCommentLines.length * 0.4)) {
                            blocks.push({
                                id: `${file.filePath}:${blockCommentStart}-${lineNum}`,
                                filePath: file.filePath,
                                startLine: blockCommentStart,
                                endLine: lineNum,
                                lineCount: lineNum - blockCommentStart + 1,
                                snippet: blockCommentLines.slice(0, 5).join("\n"),
                            });
                        }
                    }
                    blockCommentLines = [];
                }
                continue;
            }
            // Single-line comment: // or #
            const isComment = trimmed.startsWith("//") ||
                (file.language === "python" && trimmed.startsWith("#"));
            if (isComment) {
                if (currentBlockStart === null) {
                    currentBlockStart = lineNum;
                }
                const stripped = trimmed.replace(/^(\/\/|#)\s?/, "");
                consecutiveCommentLines.push(stripped);
            }
            else {
                if (trimmed === "" && currentBlockStart !== null) {
                    // Allow 1 blank line inside a comment block
                    consecutiveCommentLines.push("");
                }
                else {
                    flushBlock(i);
                }
            }
        }
        flushBlock(lines.length);
    }
    return blocks;
}
