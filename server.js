const { createServer } = require("node:http");

const db = [{ id: 1, title: "Task 1", isCompleted: false }];
const allowOrigins = [
    "http://localhost:5173",
    "https://lethanhdat1567.github.io",
    "https://lethanhdat1567.github.io/todo-frontend-vite/",
];

function serverResponse(req, res, data) {
    const origin = req.headers.origin;
    const allowOrigin = allowOrigins.includes(origin) ? origin : "*";

    res.writeHead(data.status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });

    res.end(JSON.stringify(data));
}

const server = createServer((req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
    }

    let response = { status: 200 };

    // GET /api/tasks
    if (req.method === "GET" && req.url === "/api/tasks") {
        response.data = db;
        return serverResponse(req, res, response);
    }

    // [GET] /api/tasks/:id
    if (req.method === "GET" && req.url.startsWith("/api/tasks/")) {
        const id = req.url.split("/").pop();
        const task = db.find((task) => task.id === Number(id));
        if (!task) {
            response.status = 404;
            response.data = { message: "Task not found" };
            serverResponse(req, res, response);
            return;
        }
        response.data = task;
        serverResponse(req, res, response);
        return;
    }

    // POST /api/tasks
    if (req.method === "POST" && req.url === "/api/tasks") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            const task = JSON.parse(body);
            task.id = db.length + 1;
            task.isCompleted = false;
            db.push(task);

            response.status = 201;
            response.data = task;
            serverResponse(req, res, response);
        });
        return;
    }

    // PUT /api/tasks/:id
    if (req.method === "PUT" && req.url.startsWith("/api/tasks/")) {
        const id = Number(req.url.split("/").pop());
        const task = db.find((t) => t.id === id);

        if (!task) {
            response.status = 404;
            response.data = { message: "Task not found" };
            return serverResponse(req, res, response);
        }

        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            const updatedTask = JSON.parse(body);
            if ("title" in updatedTask) task.title = updatedTask.title;
            if ("isCompleted" in updatedTask)
                task.isCompleted = updatedTask.isCompleted;

            response.data = task;
            serverResponse(req, res, response);
        });
        return;
    }

    // DELETE /api/tasks/:id
    if (req.method === "DELETE" && req.url.startsWith("/api/tasks/")) {
        const id = Number(req.url.split("/").pop());
        const index = db.findIndex((t) => t.id === id);

        if (index === -1) {
            response.status = 404;
            response.data = { message: "Task not found" };
            return serverResponse(req, res, response);
        }

        db.splice(index, 1);
        response.data = { success: true };
        serverResponse(req, res, response);
    }

    // Bypass CORS
    if (req.url.startsWith("/bypass-cors")) {
        const fullUrl = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = fullUrl.searchParams.get("url");

        if (!targetUrl) {
            res.writeHead(400, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ message: "Missing url query param" }));
            return;
        }

        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", async () => {
            try {
                const fetchOptions = {
                    method: req.method,
                    headers: {
                        "Content-Type": "application/json",
                    },
                };

                if (body && req.method !== "GET") {
                    fetchOptions.body = body;
                }

                const response = await fetch(targetUrl, fetchOptions);
                const data = await response.text();

                res.writeHead(response.status, {
                    "Content-Type":
                        response.headers.get("content-type") ||
                        "application/json",
                    "Access-Control-Allow-Origin": "*",
                });

                res.end(data);
            } catch (error) {
                res.writeHead(500, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                });
                res.end(
                    JSON.stringify({
                        message: "Bypass CORS failed",
                        error: error.message,
                    })
                );
            }
        });

        return;
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
