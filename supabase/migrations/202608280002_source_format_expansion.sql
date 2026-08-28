-- Expand source storage and grounding locators for common study-material formats.
-- Legacy binary Office files are accepted for the controlled file-input
-- extraction path when local structural conversion is unavailable.
alter table public.sources drop constraint if exists sources_kind_check;
alter table public.sources add constraint sources_kind_check
  check (kind in ('pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'image'));

alter table public.source_units drop constraint if exists source_units_locator_kind_check;
alter table public.source_units add constraint source_units_locator_kind_check
  check (locator_kind in ('page', 'slide', 'paragraph', 'sheet', 'image', 'file'));

alter table public.source_spans drop constraint if exists source_spans_locator_kind_check;
alter table public.source_spans add constraint source_spans_locator_kind_check
  check (locator_kind in ('page', 'slide', 'paragraph', 'sheet', 'image', 'file'));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/octet-stream',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
]
where id = 'course-materials';
