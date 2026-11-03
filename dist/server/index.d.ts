import { FastifyInstance } from "fastify";
export interface ServerOptions {
    port?: number;
    host?: string;
    projectRoot: string;
}
export declare function createServer(options: ServerOptions): Promise<FastifyInstance>;
export declare function startServer(options: ServerOptions): Promise<{
    port: number;
    host: string;
    url: string;
}>;
