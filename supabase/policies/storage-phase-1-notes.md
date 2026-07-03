# Storage Policy Notes

Phase 1 does not create Supabase Storage buckets or storage policies.

Future private buckets should use project-member access checks aligned with `project_members`. A likely storage path convention is:

```text
projects/{project_id}/documents/{document_id}/{filename}
projects/{project_id}/visits/{visit_id}/evidence/{evidence_id}/{filename}
```

Storage policies should verify that the authenticated user is a member of the project identified by the path or related metadata table row. Upload and upsert behavior will require explicit `select`, `insert`, and `update` storage permissions.
