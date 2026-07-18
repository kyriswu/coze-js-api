# Seedance 2.0 Video API Documentation Design

## Goal

Publish a public, project-hosted usage guide for the existing Seedance 2.0 video generation wrapper.

## Delivery

- Add `GET /docs/volcengine/seedance-2-0` to the navigation router.
- Reuse the existing API documentation EJS template.
- Add a service-card link to the navigation page.

## Content

The guide documents the implemented local routes rather than expanding the API:

1. Create task: `POST /volcengine/contents/generations/tasks`.
2. Poll task: `GET /volcengine/contents/generations/tasks/:task_id`.
3. Required local `api_key`, Seedance model example, text-to-video request, reference media roles, and task-response/polling examples.
4. The wrapper's `code/msg/data` envelope and its upstream payload pass-through behavior.

## Boundaries

- Examples contain placeholders only and never real credentials.
- No changes to the video-generation API behavior.
- Validate the router syntax and document rendering through the existing route/template conventions.
