/**
 * Entry shim so the documented command `node --test tests/` works on every Node
 * build in use.
 *
 * Newer Node releases treat a positional path as a single file instead of
 * expanding a directory, so `node --test tests/` resolves this file through
 * Node's directory resolution and the suite runs through it. The file is
 * deliberately NOT named `*.test.*`: a plain recursive `node --test` scan does
 * not match it, so the suite can never be executed twice.
 */
import './core.test.mjs'
