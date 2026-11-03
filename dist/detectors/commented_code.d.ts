import { ParsedFile } from "../parser/types.js";
import { CommentedCodeBlock } from "../graph/types.js";
export declare function detectCommentedCode(projectRoot: string, parsedFiles: ParsedFile[]): Promise<CommentedCodeBlock[]>;
