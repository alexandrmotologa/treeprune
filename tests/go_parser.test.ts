import { describe, expect, it } from "vitest";
import { parseGo } from "../src/parser/go_parser.js";

describe("parseGo", () => {
  it("should extract Go functions, exports, imports, and calls", () => {
    const code = `
package main

import (
	"fmt"
	"net/http"
	"myproject/pkg/util"
)

func ExportedHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handling")
	util.FormatLog("request")
}

func privateHelper() int {
	return 42
}

func main() {
	privateHelper()
}
`;

    const parsed = parseGo(code, "cmd/server/main.go", "cmd/server/main.go");
    expect(parsed.language).toBe("go");
    expect(parsed.imports.length).toBe(3);

    const symbolNames = parsed.symbols.map((s) => s.name);
    expect(symbolNames).toContain("ExportedHandler");
    expect(symbolNames).toContain("privateHelper");
    expect(symbolNames).toContain("main");

    const exportedHandler = parsed.symbols.find((s) => s.name === "ExportedHandler");
    expect(exportedHandler?.isExported).toBe(true);

    const privateHelper = parsed.symbols.find((s) => s.name === "privateHelper");
    expect(privateHelper?.isExported).toBe(false);

    const callNames = parsed.calls.map((c) => c.callee);
    expect(callNames).toContain("fmt.Println");
    expect(callNames).toContain("util.FormatLog");
    expect(callNames).toContain("privateHelper");
  });

  it("should extract Gin routes in Go", () => {
    const code = `
package server

import "github.com/gin-gonic/gin"

func SetupRoutes(r *gin.Engine) {
	r.GET("/api/v1/health", HealthCheck)
	r.POST("/api/v1/auth/token", GenerateToken)
}
`;

    const parsed = parseGo(code, "pkg/server/router.go", "pkg/server/router.go");
    expect(parsed.routes.length).toBe(2);
    expect(parsed.routes[0].method).toBe("GET");
    expect(parsed.routes[0].path).toBe("/api/v1/health");
    expect(parsed.routes[1].method).toBe("POST");
    expect(parsed.routes[1].path).toBe("/api/v1/auth/token");
  });
});
