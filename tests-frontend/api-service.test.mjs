import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspaceRoot = process.cwd();
const apiServiceUrl = pathToFileURL(path.join(workspaceRoot, "docs/src/framework/api-service.js")).href;

function createHeadersStub() {
    return class HeadersStub {
        #store = new Map();

        constructor(init = {}) {
            Object.entries(init).forEach(([key, value]) => {
                this.set(key, value);
            });
        }

        set(key, value) {
            this.#store.set(String(key).toLowerCase(), String(value));
        }

        has(key) {
            return this.#store.has(String(key).toLowerCase());
        }

        get(key) {
            return this.#store.get(String(key).toLowerCase()) ?? null;
        }
    };
}

function installBrowserStubs() {
    globalThis.Headers = createHeadersStub();
    globalThis.window = {
        APP_CONFIG: {
            serverUrl: "http://localhost:8000",
            apiBaseUrl: "http://localhost:8000/api",
        },
        location: { origin: "http://localhost:8000" },
        localStorage: {
            getItem(key) {
                if (key === "auth_token") {
                    return "test-token";
                }
                return null;
            },
        },
    };
}

installBrowserStubs();

const { default: ApiService } = await import(apiServiceUrl);

function createUserModel() {
    return {
        getUser() {
            return { user_id: "local_123" };
        },
    };
}

export async function runApiServiceTests() {
    let capturedRequest = null;

    globalThis.fetch = async (url, options) => {
        capturedRequest = { url, options };
        return {
            ok: true,
            async json() {
                return { ok: true };
            },
        };
    };

    const service = new ApiService("http://localhost:8000/api", createUserModel());
    await service.createCourse({ title: "New course" });

    assert.equal(capturedRequest.url, "http://localhost:8000/api/users/local_123/courses");
    assert.equal(capturedRequest.options.method, "POST");
    assert.equal(capturedRequest.options.headers.get("authorization"), "Bearer test-token");
    assert.deepEqual(JSON.parse(capturedRequest.options.body), { title: "New course" });

    globalThis.fetch = async (url, options) => {
        capturedRequest = { url, options };
        return {
            ok: true,
            async json() {
                return { ok: true, deletedCourseId: 9 };
            },
        };
    };

    const deleteResponse = await service.deleteCourse(9);
    assert.equal(capturedRequest.url, "http://localhost:8000/api/users/local_123/courses/9");
    assert.equal(capturedRequest.options.method, "DELETE");
    assert.equal(deleteResponse.deletedCourseId, 9);

    globalThis.fetch = async () => ({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        async json() {
            return { error: "Forbidden" };
        },
    });

    await assert.rejects(
        () => service.deleteCourse(1),
        (error) => error.message === "Forbidden" && error.status === 403,
    );
}
