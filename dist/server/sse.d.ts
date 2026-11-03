import { FastifyReply } from "fastify";
import { ScanProgressEvent } from "../engine.js";
export declare class SSEBroadcaster {
    private clients;
    addClient(reply: FastifyReply): void;
    broadcast(event: ScanProgressEvent): void;
    private sendEvent;
}
export declare const sseBroadcaster: SSEBroadcaster;
