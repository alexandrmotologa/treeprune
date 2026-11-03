import { describe, expect, it } from "vitest";
import { parsePython } from "../src/parser/python_parser.js";

describe("parsePython", () => {
  it("should extract functions, classes, imports, and calls", () => {
    const code = `
import os
from datetime import datetime as dt
from .services import UserService

def calculate_metrics(items):
    total = len(items)
    return total

class ReportGenerator:
    def __init__(self):
        pass

if __name__ == '__main__':
    calculate_metrics([])
`;

    const parsed = parsePython(code, "services/analytics.py", "services/analytics.py");
    expect(parsed.language).toBe("python");
    expect(parsed.imports.length).toBe(3);

    const symbolNames = parsed.symbols.map((s) => s.name);
    expect(symbolNames).toContain("calculate_metrics");
    expect(symbolNames).toContain("ReportGenerator");
    expect(symbolNames).toContain("__main__");

    const callNames = parsed.calls.map((c) => c.callee);
    expect(callNames).toContain("len");
    expect(callNames).toContain("calculate_metrics");
  });

  it("should extract FastAPI route decorators", () => {
    const code = `
from fastapi import FastAPI, APIRouter

router = APIRouter()

@router.get('/api/v1/users')
def list_users():
    return []

@router.post('/api/v1/users')
def create_user():
    return {"id": 1}
`;

    const parsed = parsePython(code, "routers/users.py", "routers/users.py");
    expect(parsed.routes.length).toBe(2);
    expect(parsed.routes[0].method).toBe("GET");
    expect(parsed.routes[0].path).toBe("/api/v1/users");
    expect(parsed.routes[0].handlerName).toBe("list_users");
    expect(parsed.routes[1].method).toBe("POST");
  });
});
