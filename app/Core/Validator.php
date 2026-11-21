<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Declarative validator. Rules are pipe-separated strings:
 *   required | nullable | string | max:n | min:n | int | numeric | bool | email | url
 *   date | time | in:a,b,c | color | ip | owned:table | after_or_equal:field | domain | list
 *
 * Returns only declared fields, normalised to proper PHP/DB types.
 */
final class Validator
{
    public static function validate(array $input, array $rules, int $userId = 0, bool $partial = false): array
    {
        $clean = [];
        $errors = [];

        foreach ($rules as $field => $ruleString) {
            $present = array_key_exists($field, $input);
            if ($partial && !$present) {
                continue;
            }
            $ruleList = explode('|', $ruleString);
            $value = $input[$field] ?? null;
            if (is_string($value)) {
                $value = trim($value);
            }
            $isEmpty = $value === null || $value === '' || (is_array($value) && $value === []);
            $label = ucfirst(str_replace('_', ' ', (string) preg_replace('/_id$/', '', $field)));

            if ($isEmpty) {
                if (in_array('required', $ruleList, true)) {
                    $errors[$field] = "$label is required.";
                } elseif (in_array('bool', $ruleList, true)) {
                    $clean[$field] = 0;
                } else {
                    $clean[$field] = in_array('list', $ruleList, true) ? [] : null;
                }
                continue;
            }

            $error = null;
            foreach ($ruleList as $rule) {
                [$name, $arg] = array_pad(explode(':', $rule, 2), 2, null);
                $error = self::check($name, $arg, $value, $label, $input, $userId);
                if ($error !== null) {
                    break;
                }
            }
            if ($error !== null) {
                $errors[$field] = $error;
                continue;
            }
            $clean[$field] = self::cast($value, $ruleList);
        }

        if ($errors !== []) {
            throw HttpException::validation($errors);
        }
        return $clean;
    }

    private static function check(string $rule, ?string $arg, mixed &$value, string $label, array $input, int $userId): ?string
    {
        switch ($rule) {
            case 'string':
                if (!is_scalar($value)) {
                    return "$label must be text.";
                }
                $value = (string) $value;
                return null;
            case 'max':
                if (is_numeric($value) && !is_string($value)) {
                    return $value > (float) $arg ? "$label must be at most $arg." : null;
                }
                return mb_strlen((string) $value) > (int) $arg ? "$label must be at most $arg characters." : null;
            case 'min':
                if (is_numeric($value)) {
                    return (float) $value < (float) $arg ? "$label must be at least $arg." : null;
                }
                return mb_strlen((string) $value) < (int) $arg ? "$label must be at least $arg characters." : null;
            case 'int':
                return filter_var($value, FILTER_VALIDATE_INT) === false ? "$label must be a whole number." : null;
            case 'numeric':
                return !is_numeric($value) ? "$label must be a number." : null;
            case 'bool':
                return null;
            case 'email':
                return filter_var($value, FILTER_VALIDATE_EMAIL) === false ? "$label must be a valid email address." : null;
            case 'url':
                $ok = filter_var($value, FILTER_VALIDATE_URL) !== false && preg_match('#^https?://#i', (string) $value);
                return $ok ? null : "$label must be a valid http(s) URL.";
            case 'date':
                $d = \DateTime::createFromFormat('!Y-m-d', (string) $value);
                return ($d && $d->format('Y-m-d') === $value) ? null : "$label must be a valid date (YYYY-MM-DD).";
            case 'time':
                if (preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', (string) $value)) {
                    $value = substr((string) $value, 0, 5);
                    return null;
                }
                return "$label must be a valid time (HH:MM).";
            case 'in':
                return in_array((string) $value, explode(',', (string) $arg), true) ? null : "$label has an invalid value.";
            case 'color':
                return preg_match('/^#[0-9a-fA-F]{6}$/', (string) $value) ? null : "$label must be a hex color.";
            case 'ip':
                return filter_var($value, FILTER_VALIDATE_IP) === false ? "$label must be a valid IP address." : null;
            case 'domain':
                $value = strtolower((string) preg_replace('#^https?://#i', '', rtrim((string) $value, '/')));
                return preg_match('/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/', $value)
                    ? null : "$label must be a valid domain name (e.g. example.com).";
            case 'after_or_equal':
                $other = $input[$arg] ?? null;
                return ($other && $value < $other) ? "$label must be on or after " . str_replace('_', ' ', (string) $arg) . '.' : null;
            case 'owned':
                if (filter_var($value, FILTER_VALIDATE_INT) === false) {
                    return "$label is invalid.";
                }
                $table = preg_replace('/[^a-z_]/', '', (string) $arg);
                $exists = Database::value("SELECT COUNT(*) FROM `$table` WHERE id = ? AND user_id = ?", [(int) $value, $userId]);
                return $exists ? null : "$label was not found.";
            case 'list':
                if (!is_array($value)) {
                    return "$label must be a list.";
                }
                return null;
            case 'required':
            case 'nullable':
                return null;
        }
        return null;
    }

    private static function cast(mixed $value, array $rules): mixed
    {
        if (in_array('bool', $rules, true)) {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }
        if (in_array('int', $rules, true) || preg_grep('/^owned:/', $rules)) {
            return (int) $value;
        }
        if (in_array('numeric', $rules, true)) {
            return round((float) $value, 2);
        }
        if (in_array('list', $rules, true)) {
            return array_values(array_unique(array_map('intval', (array) $value)));
        }
        return $value;
    }
}
