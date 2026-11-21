<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

final class HttpException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly array $fields = []
    ) {
        parent::__construct($message, $status);
    }

    public static function notFound(string $message = 'Resource not found.'): self
    {
        return new self(404, $message);
    }

    public static function forbidden(string $message = 'You are not allowed to do that.'): self
    {
        return new self(403, $message);
    }

    public static function validation(array $fields, string $message = 'Please correct the highlighted fields.'): self
    {
        return new self(422, $message, $fields);
    }
}
