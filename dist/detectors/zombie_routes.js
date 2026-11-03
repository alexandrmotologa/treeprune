export function normalizeRoutePattern(routePath) {
    const clean = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
    const segments = clean.split("/").map((seg) => {
        if (seg.startsWith(":") || (seg.startsWith("{") && seg.endsWith("}")) || seg === "*") {
            return "[^/]+";
        }
        return escapeRegex(seg);
    });
    const patternStr = `^/?${segments.join("/")}/?$`;
    return {
        regex: new RegExp(patternStr, "i"),
        normalized: "/" + clean,
    };
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const SERVER_ROUTE_REGISTRATION_METHODS = new Set([
    "app.get",
    "app.post",
    "app.put",
    "app.delete",
    "app.patch",
    "app.options",
    "app.head",
    "app.all",
    "app.use",
    "router.get",
    "router.post",
    "router.put",
    "router.delete",
    "router.patch",
    "server.get",
    "server.post",
    "fastify.get",
    "fastify.post",
    "r.get",
    "r.post",
]);
export function detectZombieRoutes(parsedFiles) {
    // 1. Collect all declared backend routes
    const declaredRoutes = [];
    for (const file of parsedFiles) {
        for (const route of file.routes) {
            declaredRoutes.push(route);
        }
    }
    if (declaredRoutes.length === 0) {
        return [];
    }
    // 2. Collect candidate client network callsites
    const clientCallUrls = [];
    for (const file of parsedFiles) {
        for (const call of file.calls) {
            const callee = call.callee.toLowerCase();
            // Skip server-side route registration calls
            if (SERVER_ROUTE_REGISTRATION_METHODS.has(callee)) {
                continue;
            }
            // Check if call is a client network request
            const isNetworkClient = callee.includes("fetch") ||
                callee.includes("axios") ||
                callee.includes("ky") ||
                callee.includes("request") ||
                callee.includes("http") ||
                callee.includes("apiclient") ||
                callee.includes("api.");
            if (isNetworkClient && call.arguments.length > 0) {
                for (const arg of call.arguments) {
                    if (typeof arg === "string" && (arg.startsWith("/") || arg.startsWith("http"))) {
                        clientCallUrls.push({ url: arg, filePath: file.filePath });
                    }
                }
            }
        }
    }
    const zombieRoutes = [];
    // 3. Cross-reference declared routes against client callsites
    for (const route of declaredRoutes) {
        const { regex } = normalizeRoutePattern(route.path);
        const matches = [];
        for (const clientCall of clientCallUrls) {
            const cleanUrl = clientCall.url.replace(/^https?:\/\/[^/]+/, "");
            if (regex.test(cleanUrl)) {
                matches.push(`${clientCall.filePath}: ${clientCall.url}`);
            }
        }
        if (matches.length === 0) {
            zombieRoutes.push({
                id: route.id,
                method: route.method,
                path: route.path,
                filePath: route.filePath,
                framework: route.framework,
                line: route.loc.start.line,
                handlerName: route.handlerName,
                possibleFrontendMatches: matches,
            });
        }
    }
    return zombieRoutes;
}
