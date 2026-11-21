<?php

declare(strict_types=1);

namespace App\Core;

final class Router
{
    /** @var array<int, array{method:string, regex:string, handler:array, middleware:array}> */
    private array $routes = [];
    private array $groupMiddleware = [];

    public function group(array $middleware, callable $register): void
    {
        $previous = $this->groupMiddleware;
        $this->groupMiddleware = array_merge($previous, $middleware);
        $register($this);
        $this->groupMiddleware = $previous;
    }

    public function add(string $method, string $pattern, array $handler, array $middleware = []): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = [
            'method' => $method,
            'regex' => $regex,
            'handler' => $handler,
            'middleware' => array_merge($this->groupMiddleware, $middleware),
        ];
    }

    public function get(string $p, array $h, array $m = []): void { $this->add('GET', $p, $h, $m); }
    public function post(string $p, array $h, array $m = []): void { $this->add('POST', $p, $h, $m); }
    public function put(string $p, array $h, array $m = []): void { $this->add('PUT', $p, $h, $m); }
    public function patch(string $p, array $h, array $m = []): void { $this->add('PATCH', $p, $h, $m); }
    public function delete(string $p, array $h, array $m = []): void { $this->add('DELETE', $p, $h, $m); }

    /** Register the standard REST routes for a resource controller. */
    public function resource(string $base, string $controller): void
    {
        $this->get($base, [$controller, 'index']);
        $this->post($base, [$controller, 'store']);
        $this->get("$base/{id}", [$controller, 'show']);
        $this->put("$base/{id}", [$controller, 'update']);
        $this->patch("$base/{id}", [$controller, 'patch']);
        $this->delete("$base/{id}", [$controller, 'destroy']);
    }

    public function dispatch(Request $request): void
    {
        $methodMatched = false;
        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $request->path, $m)) {
                continue;
            }
            if ($route['method'] !== $request->method) {
                $methodMatched = true;
                continue;
            }
            $request->params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            foreach ($route['middleware'] as $middleware) {
                (new $middleware())->handle($request);
            }
            [$class, $action] = $route['handler'];
            $result = (new $class())->$action($request);
            Response::json($result ?? ['ok' => true]);
        }
        if ($methodMatched) {
            Response::error(405, 'Method not allowed.');
        }
        Response::error(404, 'Endpoint not found.');
    }
}
