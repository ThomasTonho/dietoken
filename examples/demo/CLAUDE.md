# Cookbook service

Small service that renders recipes as static pages.

## Key rules

Always write clean code and follow best practices.
Prefer TypeScript over JavaScript in new files.
Never run anything against node_modules directly.
Tests for the API live under tests/api and mirror the route names.

## Release procedure

1. Run npm test and wait for a clean run.
2. Bump the version in package.json.
3. Tag the commit and push the tag.
4. Publish with npm publish --access public.

## Review checklist

Prefer TypeScript over JavaScript in new files.
